const io = require('socket.io')(5000, {
    cors: {
        origin: "http://localhost:3000",
    }
});

let users = []

const addUser = (newUser, socketId) => {
    !users.some(user => user.id === newUser.id) && users.push({ ...newUser, socketId })
}

const getUsers = (receivers) => {
    return users.filter(user => receivers.find(receiver => receiver === user.id))
}

io.on('connection', socket => {
    socket.on("addUser", user => {
        console.log('user connected', user)
        addUser(user, socket.id)
        io.emit("getUsers", users)
    })

    // typing and get typing

    socket.on("typing", ({sender, chatId, receivers}) => {
        const gotUses = getUsers(receivers)
        io.to(gotUses.map(user => user.socketId)).emit("getTyping", {
            sender,
            chatId
        })
    })

    socket.on("stopTyping", ({sender, chatId, receivers}) => {
        const gotUses = getUsers(receivers)
        io.to(gotUses.map(user => user.socketId)).emit("getStopTyping", {})
    })

    // send and get message
    socket.on("sendMessage", ({id, sender, receivers, text, createdAt, chatId }) => {
        const gotUses = getUsers(receivers)
        io.to(gotUses.map(user => user.socketId)).emit("getMessage", {
            id,
            sender,
            text,
            createdAt,
            chatId
        })
    })

    socket.on("disconnect", () => {
        console.log('User disconnected')
        users = users.filter(user => user.socketId !== socket.id)
        io.emit("getUsers", users)
    })
})