const User = require('../models/userModal');
const bcrypt = require('bcrypt');
const Chat=require('../models/chatModel');
const Group=require('../models/groupModel');
const GroupChat=require('../models/groupChatModel');
const { response } = require('../routes/userRoute');

const Member=require('../models/memberModel')
const mongoose=require('mongoose')

const registerLoad = async (req, res) => {
    try {
        res.render('register');
    } catch (error) {
        console.log(error.message);
    }
};

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const image = req.file;

        if (!name || !email || !password || !image) {
            return res.render('register', { message: "Please fill in all fields." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name: name,
            email: email,
            image: 'images/' + image.filename,
            password: hashedPassword
        });

        await user.save();
        res.render('register', { message: "Registration successful!" });
    } catch (error) {
        console.log(error.message);
        res.render('register', { message: "An error occurred during registration." });
    }
};

const loadLogin =async(req,res)=>{
    try {
        res.render('login')
        
    } catch (error) {
        console.log(error.message)
    }
}
const login =async(req,res)=>{
    try {
        const email=req.body.email;
        const password=req.body.password;

        const userData =await User.findOne({ email:email})
        if(userData){

            const passwordMatch=await bcrypt.compare(password,userData.password)
            if(passwordMatch){
                req.session.user=userData;
                res.cookie('user',JSON.stringify(userData));
                res.redirect('/dashboard')
            }

        }
        else{
            res.render('login',{message:'Email and Password is Incorrect!'})
        }

        
    } catch (error) {
        console.log(error.message)
    }
}
const logout =async(req,res)=>{
    try {
        req.clearCookie('user')
        req.session.destroy;
        res.redirect('/')
        
    } catch (error) {
        console.log(error.message)
    }
}
const loadDashboard =async(req,res)=>{
    try {
        var users=await User.find({ _id:{$nin:[req.session.user._id]}})
        res.render('dashboard',{user:req.session.user,users:users})
    } catch (error) {
        console.log(error.message)
    }
}
const saveChat=async(req,res)=>{
    try {
       let chat= new Chat({
            sender_id:req.body.sender_id,
        receiver_id:req.body.receiver_id,
        message:req.body.message
        })
        await chat.save();
        res.status(200).send({success:true,msg:'Chat Inserted!',data:chat})
        
        
    } catch (error) {
        res.status(400).send({success:false,msg:error.message})
    }
}
const deleteChat=async (req,res)=>{
    try {
        await Chat.deleteOne({_id:req.body.id})
        res.status(200).send({success:true})

    } catch (error) {
        res.status(400).send({success:false,msg:error.message})

    }
}
const updateChat=async (req,res)=>{
    try {
        await Chat.findByIdAndUpdate({_id:req.body.id},{
            $set:{
                message:req.body.message
            }
        })
        res.status(200).send({success:true})

    } catch (error) {
        res.status(400).send({success:false,msg:error.message})

    }
}
const loadGroups=async (req,res)=>{
    try {

        const group=await Group.find({ creator_id:req.session.user._id})
       
        res.render('groups',{group:group})
        
    } catch (error) {
        console.log(error.message)
    }
}
const createGroups = async (req, res) => {
    try {
        const groups = new Group({
            creator_id: req.session.user._id,
            name: req.body.name,
            image: 'images/' + req.file.filename,
            limit: req.body.limit
        });
        await groups.save();

        // Fetch the updated list of groups
        const group = await Group.find({ creator_id: req.session.user._id });

        res.render('groups', { message: req.body.name + ' Group Created Successfully', group: group });
    } catch (error) {
        console.log(error.message);
        res.render('groups', { message: "An error occurred during group creation.", group: [] });
    }
};

const getMembers = async (req, res) => {
    try {
       

        const users = await User.aggregate([
            {
                $lookup: {
                    from: "members",
                    localField: "_id",
                    foreignField: "user_id",
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                    
                                    {$eq:["$group_id",new mongoose.Types.ObjectId(req.body.group_id)]}
                                    
                                    ]
                                }
                            }
                        }
                    ],
                    as: "member"
                }
            },
            {
                $match: {
                    "_id": {
                        $nin:[new mongoose.Types.ObjectId(req.session.user._id)]
                    }
                }
            }
        ]);

        res.status(200).send({ success: true, data: users });
    } catch (error) {
        res.status(400).send({ success: false, msg: error.message });
    }
};
const addMembers=async (req,res)=>{
    try {
        console.log(req.body); // Log the incoming request body
       
        if(!req.body.members){
            return res.status(200).send({success:false,msg:'Please select any one'})
        }
        else if(req.body.members.length > parseInt(req.body.limit)){
            return res.status(200).send({success:false,msg:'You can select only up to your limit, which is '+req.body.limit+' members'})
        }
        else{
            await Member.deleteMany({group_id: req.body.group_id});

            var data = [];
            const members = req.body.members;
    
            for(let i=0; i<members.length; i++){
                data.push({
                    group_id: req.body.group_id,
                    user_id: members[i]
                });
            }
    
            await Member.insertMany(data);
            res.status(200).send({success:true,msg:'Member added successfully'});
        }
       

    } catch (error) {
        console.log(error.message); // Log the error message
        res.status(400).send({success:false,msg:error.message});
    }
}

const updateChatGroup=async(req,res)=>{

    try {
        if(parseInt(req.body.limit)<parseInt(req.body.last_limit)){
            await Member.deleteMany({group_id:req.body.id})
        }
        var updateObj;

        if(req.file!=undefined){
            updateObj={
                name:req.body.name,
                image:'images/'+req.file.filename,
                limit:req.body.limit
            }
           
        }
        else{
            updateObj={
                name:req.body.name,
                limit:req.body.limit
            }   
        }
        await Group.findByIdAndUpdate({_id:req.body.id},{
            $set:updateObj
        })





        res.status(200).send({success:true,msg:'Chat Group updated successfully'})

        
    } catch (error) {
        res.status(400).send({success:false,msg:error.message})
    }



}
const deleteChatGroup=async(req,res)=>{

    try {
      


       await Group.deleteOne({_id:req.body.id})
       await Member.deleteMany({group_id:req.body.id})
        res.status(200).send({success:true,msg:'Chat Group Deleted successfully'})

        
    } catch (error) {
        res.status(400).send({success:false,msg:error.message})
    }



}


const shareGroup=async (req,res)=>{

    try {

        var groupData=await Group.findOne({_id:req.params.id})

        if(!groupData){
            res.render('error',{message:'404 Not found'})
        }
        else if(req.session.user==undefined){
            res.render('error',{message:'You need to login'})
        }
        else{

            var totalMembers=await Member.find({group_id:req.params.id}).countDocuments();
            var available=groupData.limit-totalMembers;

            var isOwner=groupData.creator_id==req.session.user._id?true:false;
            var isJoined=await Member.find({group_id:req.params.id,user_id:req.session.user._id}).countDocuments();

            res.render('shareLink',{group:groupData,available:available,totalMembers:totalMembers,isOwner:isOwner,isJoined:isJoined})



        }

        
    } catch (error) {
        console.log(error.message)
    }


}

const joinGroup=async (req,res)=>{

    try {  
        
        const member=new Member({

            group_id:req.body.group_id,
            user_id:req.session.user._id

        })
        await member.save();

            res.send({success:true,msg:'Congratulations ,you have join the group successfully'}) 

        
    } catch (error) {
       res.send({success:false,msg:error.message}) 
    }


}
const groupChats=async(req,res)=>{
    try {
        const myGroups=await Group.find({creator_id:req.session.user._id})
        const joinedGroups=await Member.find({user_id:req.session.user._id}).populate('group_id')

        res.render('chat-group',{myGroups:myGroups,joinedGroups:joinedGroups})
        
    } catch (error) {
        console.log(error.message)
    }



}

const saveGroupChat=async (req,res)=>{

    try {  
           var chat= new GroupChat({
                sender_id:req.body.sender_id,
                group_id:req.body.group_id,
                message:req.body.message

            })
            var newChat=await chat.save();

            res.send({success:true,chat:newChat}) 

        
    } catch (error) {
       res.send({success:false,msg:error.message}) 
    }


}
const loadGroupChats=async (req,res)=>{

    try {  

       const groupChats=await GroupChat.find({group_id:req.body.group_id}).populate('sender_id')

       res.send({success:true,chats:groupChats}) 

        
    } catch (error) {
       res.send({success:false,msg:error.message}) 
    }


}
const deleteGroupChat=async (req,res)=>{

    try {  

        await GroupChat.deleteOne({_id:req.body.id});
            res.send({success:true,msg:'Chat deleted'}) 

        
    } catch (error) {
       res.send({success:false,msg:error.message}) 
    }


}

const updateGroupChat=async (req,res)=>{

    try {  

        await GroupChat.findByIdAndUpdate({_id:req.body.id},{
            $set:{
                message:req.body.message
            }


        });
            res.send({success:true,msg:'Chat deleted'}) 

        
    } catch (error) {
       res.send({success:false,msg:error.message}) 
    }


}


module.exports = {
    registerLoad,
    register,
    loadLogin,
    login,
    logout,
    loadDashboard,
    saveChat,
    deleteChat,
    updateChat,
    loadGroups,
    createGroups,
    getMembers,
    addMembers,
    updateChatGroup,
    deleteChatGroup,
    shareGroup,
    joinGroup,
    groupChats,
    saveGroupChat,
    loadGroupChats,
    deleteGroupChat,
    updateGroupChat
};
