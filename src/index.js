const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')


const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT 

// Define paths for Express config
const publicDirectoryPath = path.join(__dirname, '../public')

// Setup static directory to serve
app.use(express.static(publicDirectoryPath))


io.on('connection', (socket) => {
    console.log('New WebSocket connection')
    
    socket.on('join', ({ username, room }, cb) => {
        const { error, user } =  addUser({ id: socket.id, username, room })

        if (error) {
            return cb(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Welcome!', "Admin" ))
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined!`, "Admin"))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        cb()


    })

    socket.on('sendMessage', (message, cb) => {
        const user = getUser(socket.id)
        const filter = new Filter()
 
        if(filter.isProfane(message)){
            return cb('Profanity is not allowed!')
        }
        io.to(user.room).emit('message', generateMessage(message, user.username))
        cb()
    })

    socket.on('sendLocation', (location, cb) => {
        const user = getUser(socket.id)
        const url = `https://google.com/maps?q=${location.latitude},${location.longitude}`
        io.to(user.room).emit('locationMessage', generateLocationMessage(url, user.username))
        cb()
    })

  

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if(user) {
            io.to(user.room).emit('message', generateMessage(`A ${user.username} has left!`, "Admin"))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
        
    })
})

server.listen(port, () => {
    console.log(`Server is up on port ${port}`)
}) 
