require('dotenv').config();

const mongoose=require('mongoose')

mongoose.connect('mongodb://127.0.0.1:27017/chatApp');
const app=require('express')();
const http=require('http').Server(app)
const userRoute=require('./routes/userRoute')
const User=require('./models/userModal')
app.use('/',userRoute)
const Chat=require('./models/chatModel')

const io =require('socket.io')(http)

var usp=io.of('/user-namespace')

usp.on('connection',async function(socket){
    console.log('User connected')
var userId=socket.handshake.auth.token;

await User.findByIdAndUpdate({_id:userId},{$set:{is_online:'1'}})

//user broadcast online status
socket.broadcast.emit('getOnlineUser',{user_id:userId});


socket.on('disconnect',async function(){
    console.log('user disconnected')
    var userId=socket.handshake.auth.token;

await User.findByIdAndUpdate({_id:userId},{$set:{is_online:'0'}})
socket.broadcast.emit('getOfflineUser',{user_id:userId});


})
//chatting implementation

socket.on('newChat',function(data){
    socket.broadcast.emit('loadNewChat',data);
})

//load old chats

socket.on('existChat',async function(data){
    var chats=await Chat.find({$or:[
        {sender_id:data.sender_id,receiver_id:data.receiver_id},
        {sender_id:data.receiver_id,receiver_id:data.sender_id}
    ]});
    socket.emit('loadChats',{chats:chats})
})

//delete chats
socket.on('chatDeleted',function(id){
    socket.broadcast.emit('chatmsg',id)
})
//update chats
socket.on('chatUpdated',function(data){
    socket.broadcast.emit('chatmsgupdated',data)
})
//new group chat added

socket.on('newGroupChat',function(data){
    socket.broadcast.emit('loadNewGroupChat',data);//broadcast chat group
})
socket.on('groupChatDeleted',function(id){
    socket.broadcast.emit('groupChatMesssageDeleted',id);//broadcast delete group
})
//update chat chats
socket.on('groupChatUpdated',function(data){
    socket.broadcast.emit('groupChatMessageUpdated',data)
})
//


})

http.listen(9000,()=>{
    console.log("server is working")
})