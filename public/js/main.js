(function($) {
    "use strict";

    var fullHeight = function() {
        $('.js-fullheight').css('height', $(window).height());
        $(window).resize(function() {
            $('.js-fullheight').css('height', $(window).height());
        });
    };
    fullHeight();

    $('#sidebarCollapse').on('click', function() {
        $('#sidebar').toggleClass('active');
    });

})(jQuery);

// ----------------------------------------------------------------------------------------------------dynamic chat application starts here

function getCookie(name) {
    let matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}

var userData = JSON.parse(getCookie('user'));
var sender_id = userData._id;
var global_group_id;
var receiver_id;
var socket = io('/user-namespace', {
    auth: {
        token: userData._id
    }
});

$(document).ready(function() {
    $('.user-list').on('click', function() {
        var userId = $(this).data('id');
        receiver_id = userId;

        $('.start-head').hide();
        $('.chat-section').show();
        socket.emit('existChat', { sender_id: sender_id, receiver_id: receiver_id });
    });
});

// Update user online status
socket.on('getOnlineUser', function(data) {
    $('#' + data.user_id + '-status').text('Online').removeClass('offline-status').addClass('online-status');
});

// Update user offline status
socket.on('getOfflineUser', function(data) {
    $('#' + data.user_id + '-status').text('Offline').addClass('offline-status').removeClass('online-status');
});

$('#chat-form').submit(function(event) {
    event.preventDefault();
    var message = $('#message').val();

    $.ajax({
        url: '/save-chat',
        type: 'POST',
        data: {
            sender_id: sender_id,
            receiver_id: receiver_id,
            message: message
        },
        success: function(response) {
            if (response && response.success) {
                $('#message').val('');
                let chat = response.data.message;
                let html = `
                    <div class="current-user-chat" id="${response.data._id}">
                        <span>${chat}</span>
                        <i class="fa fa-trash" aria-hidden="true" data-id="${response.data._id}" data-toggle="modal" data-target="#deleteChatModal"></i>
                        <i class="fa fa-edit" aria-hidden="true" data-id="${response.data._id}" data-msg="${encodeURIComponent(chat)}" data-toggle="modal" data-target="#editChatModal"></i>
                    </div>`;
                $('#chat-container').append(html);
                socket.emit('newChat', response.data);
                scrollchat();
            } else {
                console.log(response.msg);
            }
        },
        error: function(err) {
            console.error(err);
        }
    });
});

socket.on('loadNewChat', function(data) {
    if (sender_id == data.receiver_id && receiver_id == data.sender_id) {
        let html = `
            <div class="distance-user-chat" id="${data._id}">
                <h5><span>${data.message}</span></h5>
            </div>`;
        $('#chat-container').append(html);
        scrollchat();
    }
});

socket.on('loadChats', function(data) {
    $('#chat-container').html('');
    var chats = data.chats;
    let html = '';
    for (let x = 0; x < chats.length; x++) {
        let addClass = chats[x]['sender_id'] == sender_id ? 'current-user-chat' : 'distance-user-chat';
        html += `
            <div class="${addClass}" id="${chats[x]['_id']}">
                <h5>
                    <span>${chats[x]['message']}</span>`;
        if (chats[x]['sender_id'] == sender_id) {
            html += `
                    <i class="fa fa-trash" aria-hidden="true" data-id="${chats[x]['_id']}" data-toggle="modal" data-target="#deleteChatModal"></i>
                    <i class="fa fa-edit" aria-hidden="true" data-id="${chats[x]['_id']}" data-msg="${encodeURIComponent(chats[x]['message'])}" data-toggle="modal" data-target="#editChatModal"></i>`;
        }
        html += `
                </h5>
            </div>`;
    }
    $('#chat-container').append(html);
    scrollchat();
});
function scrollchat() {
    $('#group-chat-container').animate({
        scrollTop: $('#group-chat-container').offset().top + $('#group-chat-container')[0].scrollHeight
    }, 0);
}



// Delete chat
$(document).on('click', '.fa-trash', function() {
    let msg = $(this).parent().text();
    $('#delete-message').text(msg);
    $('#delete-message-id').val($(this).data('id'));
});

$('#delete-chat-form').submit(function(event) {
    event.preventDefault();
    var id = $('#delete-message-id').val();

    $.ajax({
        url: '/delete-chat',
        type: 'POST',
        data: { id: id },
        success: function(res) {
            if (res.success) {
                $('#' + id).remove();
                $('#deleteChatModal').modal('hide');
                socket.emit('chatDeleted', id);
            } else {
                console.log(res.msg);
            }
        },
        error: function(err) {
            console.error(err);
        }
    });
});

socket.on('chatmsg', function(id) {
    $('#' + id).remove();
});

// Update user chat
$(document).on('click', '.fa-edit', function() {
    $('#edit-message-id').val($(this).data('id'));
    $('#update-message').val(decodeURIComponent($(this).data('msg')));
});

$('#update-chat-form').submit(function(event) {
    event.preventDefault();
    var id = $('#edit-message-id').val();
    var msg = $('#update-message').val();

    $.ajax({
        url: '/update-chat',
        type: 'POST',
        data: { id: id, message: msg },
        success: function(res) {
            if (res.success) {
                $('#editChatModal').modal('hide');
                $('#' + id).find('span').text(msg);
                $('#' + id).find('.fa-edit').data('msg', msg);
                socket.emit('chatUpdated', { id: id, message: msg });
            } else {
                console.log(res.msg);
            }
        },
        error: function(err) {
            console.error(err);
        }
    });
});

socket.on('chatmsgupdated', function(data) {
    $('#' + data.id).find('span').text(data.message);
});

// Add member JS
$('.addMember').click(function() {
    var id = $(this).data('id');
    var limit = $(this).data('limit');

    $('#group_id').val(id);
    $('#limit').val(limit);

    $.ajax({
        url: '/get-members',
        type: 'POST',
        data: { group_id: id },
        success: function(res) {
            console.log(res)
            if (res.success) {
                let users = res.data;
                let html = '';
                for (let i = 0; i < users.length; i++) {
                    let isMember=users[i]['member'].length>0?true:false;

                    html += `
                        <tr>
                            <td><input type='checkbox'`+(isMember?'checked':'')+` name='members[]' value='`+users[i]['_id']+`' /></td>
							<td>`+users[i]['name']+`</td>
                        </tr>`;
                }
                $('.addMemberInTable').html(html);
            } else {
                alert(res.msg);
            }
        },
        error: function(err) {
            console.error(err);
        }
    });
});
//add member form


$('#add-member-form').submit(function(event){
    event.preventDefault();

    var formData=$(this).serialize();

    $.ajax({
        url:"/add-members",
        type:"POST",
        data:formData,
        success:function(res){
            if(res.success){
                $('#memberModal').modal('hide');
                $('#add-member-form')[0].reset();
                alert(res.msg)
            }
            else{
                $('#add-member-error').text(res.msg);
                setTimeout(() => {
                    $('#add-member-error').text('');

                }, 3000);
            }
        }

    })
})
//update group script

$('.updateMember').click(function(){

    var obj =JSON.parse($(this).attr('data-obj'));
    $('#update_group_id').val(obj._id);
    $('#last_limit').val(obj.limit);
    $('#group_name').val(obj.name);
    $('#group_limit').val(obj.limit);

})


$('#updateChatGroupForm').submit(function(e){
    e.preventDefault();

    $.ajax({

        url:'/update-chat-group',
        type:'POST',
        data:new FormData(this),
        contentType:false,
        cache:false,
        processData:false,
        success:function(res){
            alert(res.msg);
            if(res.success){
                location.reload()
            }
        }



    })
})
//delete chat group

$('.deleteGroup').click(function(){
    $('#delete_group_id').val($(this).attr('data-id'))
    $('#delete_group_name').text($(this).attr('data-name'))
})

$('#deleteChatGroupForm').submit(function(e){
    e.preventDefault();

    var formData=$(this).serialize();

    $.ajax({
        url:'/delete-chat-group',
        type:'POST',
        data:formData,
        success:function(res){
            alert(res.msg);
            if(res.success){
                location.reload()
            }
        }



    })
})
///--------------------------share copy the link

$('.copy').click(function(){

    $(this).prepend('<span class="copied_text"> copied </span>')

    var group_id=$(this).attr('data-id');
    var url=window.location.host+'/share-group/'+group_id;

    var temp=$("<input>");
    $("body").append(temp);
    temp.val(url).select();
    document.execCommand("copy");

    temp.remove();

    setTimeout(() => {
        $('.copied_text').remove()
    }, 2000);
})
//join group script
$('.join-now').click(function(){
    $(this).text('Wait...');
    $(this).attr('disabled','disabled');

    var group_id=$(this).attr('data-id');

    $.ajax({
        url:"/join-group",
        type:"POST",
        data:{group_id:group_id},
        success:function(res){
            alert(res.msg)
            if (res.success) {
                location.reload();
            } else {
                alert(res.msg);
                $(this).text('Join Now');
                $(this).removeAttr('disabled');
            }

        }

    })




})
// Group Chatting Script
$('.group-list').click(function() {
    $('.group-start-head').hide();
    $('.group-chat-section').show();

    global_group_id = $(this).attr('data-id');
    loadGroupChats();
});

// Ensure the form submission handler is only attached once
$('#group-chat-form').off('submit').on('submit', function(event) {
    event.preventDefault();
    var message = $('#group-message').val();

    $.ajax({
        url: '/group-chat-save',
        type: 'POST',
        data: {
            sender_id: sender_id,
            group_id: global_group_id,
            message: message
        },
        success: function(response) {
            if (response.success) {
                $('#group-message').val('');
                let message = response.chat.message;
                let html = `
                    <div class="current-user-chat" id="${response.chat._id}">
                        <h5><span>${message}</span>
                        <i class="fa fa-trash deleteGroupChat" aria-hidden="true" data-id="${response.chat._id}" data-toggle="modal" data-target="#deleteGroupChatModel"></i>
                        <i class="fa fa-edit editGroupChat" aria-hidden="true" data-id="${response.chat._id}" data-msg="${message}" data-toggle="modal" data-target="#editGroupChatModal"></i></h5>
                    </div>`;
                $('#group-chat-container').append(html);
                socket.emit('newGroupChat', response.chat);
                scrollchat();
            } else {
                alert(response.msg);
            }
        }
    });
});


socket.on('loadNewGroupChat', function(data) {
    if (global_group_id == data.group_id) {
        let html = `
            <div class="distance-user-chat" id="${data._id}">
                <span>${data.message}</span>
            </div>`;
        $('#group-chat-container').append(html);
        scrollchat();
    }
});

function loadGroupChats() {
    $.ajax({
        url: "/load-group-chats",
        type: "POST",
        data: { group_id: global_group_id },
        success: function(res) {
            if (res.success) {
                var chats = res.chats;
                var html = '';
                for (let i = 0; i < chats.length; i++) {
                    let className = 'distance-user-chat';
                    if (chats[i]['sender_id'] == sender_id) {
                        className = 'current-user-chat';
                    }
                    html += `
                        <div class="${className}" id="${chats[i]['_id']}">
                          <h5>
                            <span>${chats[i]['message']}</span>`;
                if (chats[i]['sender_id'] == sender_id) {
                        html+=`
                        <i class="fa fa-trash deleteGroupChat" aria-hidden="true" data-id='`+chats[i]['_id']+`' data-toggle="modal" data-target="#deleteGroupChatModel"></i>
                     <i class="fa fa-edit editGroupChat" aria-hidden="true" data-id="${chats[i]['_id']}" data-msg="${chats[i]['message']}" data-toggle="modal" data-target="#editGroupChatModal"></i>

                        `
    }
                    html+=`

                          </h5>
                        </div>`;
                }
                $('#group-chat-container').html(html);
            } else {
                alert(res.msg);
            }
        }
    });
}
//delete group chat
$(document).on('click','.deleteGroupChat',function(){

    var msg=$(this).parent().find('span').text();
    $('#delete-group-message').text(msg)
    $('#delete-group-message-id').val($(this).attr('data-id'))
    
})
$('#delete-group-chat-form').submit(function(e){

    e.preventDefault();

    var id=$('#delete-group-message-id').val();

    $.ajax({
        url:'/delete-group-chat',
        type:'POST',
        data:{id:id},
        success:function(res){
            if (res.success) {
            $('#'+id).remove(); 
            $('#deleteGroupChatModel').modal('hide');
            socket.emit('groupChatDeleted',id)   
            } else {
             alert(res.msg)   
            }
        }


    })


})
//listen delete msg chat

socket.on('groupChatMessageDeleted', function(id){ 
    $('#'+id).remove();
});

//update group chat

$(document).on('click','.editGroupChat',function(){

    $('#edit-group-message-id').val($(this).attr('data-id'))
    $('#update-group-message').val($(this).attr('data-msg'))
    
})
$('#update-group-chat-form').submit(function(e){

    e.preventDefault();

    var id=$('#edit-group-message-id').val();
    var msg=$('#update-group-message').val();

    $.ajax({
        url:'/update-group-chat',
        type:'POST',
        data:{id:id,message:msg},
        success:function(res){
            if (res.success) {
            $('#editGroupChatModal').modal('hide');
                $('#'+id).find('span').text(msg);
                $('#'+id).find('.editGroupChat').attr('data-msg',msg)
                socket.emit('groupChatUpdated',{id:id,message:msg})


        } else {
             alert(res.msg)   
            }
        }


    })


})

socket.on('groupChatMessageUpdated', function(data){ 
    $('#'+data.id).find('span').text(data.message);


});

