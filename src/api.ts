import * as crypto from 'crypto'
const express = require('express')
const uuidv1 = require('uuid/v1')
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken')
const auth = require('basic-auth')
const http = require('http')

const app = express()

class User {

    private chatRooms: Array<string>
    private gameRooms: Array<string>
    private challenges: Array<any>

    constructor(public uuid: string, public name: string, public color: string, public token: string) {
        this.chatRooms = []
        this.gameRooms = []
        this.challenges = []
    }

    publicView(): any {
        return {
            uuid: this.uuid,
            name: this.name,
            color: this.color,
            gameRooms: this.gameRooms
        }
    }

	changeSettings(name: string, color: string): void {
        if (name.length > 0) {
            this.name = name
        }
        if (color.length > 0) {
            this.color = color
        }
    }

    getChatRooms(): any {
        return this.chatRooms.reduce((acc, cur, index) => {
            acc[cur] = state.chatRooms[cur]
            return acc
        }, {})
    }

    getGameRooms(): any {
        return this.gameRooms.reduce((acc, cur, index) => {
            acc[cur] = state.gameRooms[cur]
            return acc
        }, {})
        //return this.gameRooms.map((element: string) => state.gameRooms[element])
    }

    createGameRoom(): GameRoom {
        const uuid = uuidv1()
        this.gameRooms.push(uuid)

        let gameRoom = new GameRoom(uuid, this.uuid, 2, { rows: 6, cols: 7 })
        state.gameRooms[uuid] = gameRoom

        return gameRoom
    }

    sendChallenge(userId: string, gameRoomId: string): void {
        let user = state.users[userId]
        user.recvChallenge({userId: this.uuid, gameRoomId: gameRoomId})
    }

    recvChallenge(challenge: any): void {
        this.challenges.push(challenge)
    }

    acceptChallenge(userId: string, gameRoomId: string): void {
        state.users[userId].joinGameRoom(gameRoomId)

        this.challenges = this.challenges.filter((element: any) => {
            element.userId != userId && element.gameRoomId !== gameRoomId
        })
    }

    rejectChallenge(): void {
        // TODO

    }

    joinGameRoom(uuid: string): void {
        this.gameRooms.push(uuid)

        let gameRoom = state.gameRooms[uuid]
        gameRoom.addUser(this.uuid)
    }

    isInRoom(roomType: string, roomId: string): boolean {
        if (roomType === 'chatRoom') {
            return state.chatRooms[roomId].users.indexOf(this.uuid) !== -1
        } else if (roomType === 'gameRoom') {
            return state.gameRooms[roomId].users.indexOf(this.uuid) !== -1
        } else {
            // error
            // TODO: fix
            return false
        }
    }

    canPlay(gameRoomId: string): boolean {
        return this.uuid === state.gameRooms[gameRoomId].turn
    }

    play(gameRoomId: string, column: number): void {
        // TODO
        state.gameRooms[gameRoomId].play(this.uuid, column)
    }

    leaveGameRoom(uuid: string): void {
        this.gameRooms = this.gameRooms.filter((element: string) => element !== uuid)

        let gameRoom = state.gameRooms[uuid]
        gameRoom.removeUser(this.uuid)
    }

    watchGameRoom(uuid: string): void {
        // TODO
    }

    ignoreGameRoom(uuid: string): void {
        // TODO
    }

    deleteGameRoom(uuid: string): void {
        // there can only be one user in the gameRoom if this function is called
        this.gameRooms = this.gameRooms.filter((element: string) => element !== uuid)
        delete state.gameRooms[uuid]
    }

    createChatRoom(): ChatRoom {
        const uuid = uuidv1()
        this.chatRooms.push(uuid)

        let chatRoom = new ChatRoom(uuid, this.uuid)
        state.chatRooms[uuid] = chatRoom

        return chatRoom
    }

    sendChatInvite(uuid: string): void {

    }

    acceptChatInvite(uuid: string): void {

    }

    rejectChatInvite(): void {

    }

    joinChatRoom(uuid: string): void {
        this.chatRooms.push(uuid)

        let chatRoom = state.chatRooms[uuid]
        chatRoom.addUser(this.uuid)
    }

    isInChatRoom(chatRoomId: string): boolean {
        return this.chatRooms.indexOf(chatRoomId) !== -1
    }

    chat(chatRoomId: string, text: string): void {
        const uuid = uuidv1()
        const timestamp = new Date()
        const message = new Message(uuid, this.uuid, timestamp, text)

        let chatRoom = state.chatRooms[uuid]
        chatRoom.write(message)
    }

    leaveChatRoom(uuid: string): void {
        this.chatRooms = this.chatRooms.filter((element: string) => element !== uuid)

        let chatRoom = state.chatRooms[uuid]
        chatRoom.removeUser(this.uuid)
    }

    ejectFromChatRoom(uuid: string, userId: string): void {
        // owner can remove the selected user from the chatroom (cannot remove self)
    }
    
    deleteChatRoom(uuid: string): void {
        let chatRoom = state.chatRooms[uuid]
        // remove chatRooms from all users
        chatRoom.users.forEach(user => user.leaveChatRoom(uuid))
        delete state.chatRooms[uuid]
    }
}

abstract class Room {

    protected users: Array<string>

    constructor(protected uuid: string) {
        this.users = []
    }

    getUsers(): Array<string> {
        return this.users
    }

    addUser(userId: string): void {
        this.users.push(userId)
    }

    removeUser(userId: string): void {
        this.users = this.users.filter((element: string) => element !== userId)
    }

    abstract isOwnedBy(userId: string): boolean
}

class GameRoom extends Room {

    private watchers: Array<string>
    private turn: string
    private board: any

        constructor(uuid: string, private owner: string, private maxUsers: number, private boardSize: any) {
        super(uuid)
        this.addUser(owner)
        this.watchers = []
        this.turn = owner
        this.maxUsers = maxUsers

        let boardState: Array<any> = []
        for (let i: number = 0; i < boardSize.cols; i++) { boardState.push([]) }

        // TODO: use extend instead
        this.board = {
            rows: boardSize.rows,
            cols: boardSize.cols,
            state: boardState
        }
    }

    isFull(): boolean {
        return this.users.length < this.maxUsers
    }

    isEmpty(): boolean {
        return this.users.length === 1
    }

    addWatcher(userId: string): void {
        this.watchers.push(userId)
    }

    removeWatcher(userId: string): void {
        this.watchers = this.watchers.filter(element => element !== userId)
    }

    updateTurn(): void {
        this.turn = this.users[(this.users.indexOf(this.turn) + 1) % this.users.length]
    }

    reset(winner: string): void {
        this.users = [winner]
        this.turn = winner
    }

    isOwnedBy(userId: string): boolean {
        return this.users.length === 1 && this.users.shift() === userId
    }

    play(userId: string, col: number): void {
        let column = this.board.state[col]
        if (column.length === this.board.state.rows) {
            // fail
        } else {
            column.push(userId)
            this.updateTurn()
        }
    }
}

class ChatRoom extends Room {

    private messages: Array<Message>

    constructor(uuid: string, private owner: string) {
        super(uuid)
        this.addUser(owner)
        this.owner = owner
        this.messages = []
    }

    write(message: Message): void {
        this.messages.push(message)
    }

    isOwnedBy(userId: string): boolean {
        return this.owner === userId
    }
}

class Message {

    constructor(private uuid: string, private userId: string, private timestamp: Date, private text: string) {}

    toString(): string {
        return JSON.stringify(this)
    }
}

// secret for signing/verifying JWTs
const secret = crypto.randomBytes(32).toString('hex')

let state = {
    'tokens': {},
    'users': {},
    'chatRooms': {},
    'gameRooms': {}
}

let lobbyUuid = uuidv1()
state.chatRooms[lobbyUuid] = new ChatRoom(lobbyUuid, 'admin')

/*
 * Generic request handler for verifying JWTs
 * This is a handler factory
 *
 * If called with one argument, use the handlerAuth function to handle all valid requests.
 * TODO: put handlerNoAuth first in the param list
 */
function handle(handlerAuth: any, handlerNoAuth: any): any {
    return function(req: any, res: any): void {
        console.log(req.method, req.path, JSON.stringify(req.query), JSON.stringify(req.body))
        const authHeader = req.get('Authorization')
        if (authHeader) {
            console.log('> auth header present')
            const parsedAuthHeader = authHeader.split(' ')
            if (parsedAuthHeader[0] === 'Bearer' && parsedAuthHeader.length === 2) {
                console.log('> auth header valid')
                try {
                    console.log('> verifying payload')
                    const payload = jwt.verify(parsedAuthHeader[1], secret)
                    const userId = payload.jti

                    console.log('> verified payload:', payload, userId)
                    handlerAuth(req, res, state.users[userId])
                } catch (e) {
                    // the JWT is invalid
                    
                    res.status(400).json({error: 'invalid JWT' + [req.method, req.path, JSON.stringify(req.query), JSON.stringify(req.body)].join(',') + ' ' + e.toString()})
                }

            } else {
                // the Authorization header is malformed
                res.status(400).json({error: 'malformed Authorization header'})
            }
        } else {
            // no Authorization header
            if (handlerNoAuth) {
                handlerNoAuth(req, res)
            } else {
                handlerAuth(req, res)
            }
        }
    };
}

//app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Origin, Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE")
    next();
})
/*
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
*/

app.route('/')
    .get(handle((req, res, user) => {
        // render app dashboard
        // TODO
        res.status(200).render()
    }, (req, res) => {
        // TODO
        // render login page
        res.status(200).render()
    }))

app.route('/chatRooms')
    .get(handle((req, res, user) => {
        // get list of your chatRooms
        res.status(200).json({ data: { chatRooms: user.getChatRooms() } })
    }, (req, res) => {
        res.status(403).json({ error: 'sign up to start chatting' })
    }))
    .post(handle((req, res, user) => {
        // create a new chatRoom
        let chatRoom = user.createChatRoom()
        res.status(200).json({ data: { chatRoom: chatRoom } })
    }, (req, res) => {
        res.status(403).json({ error: 'sign up to start chatting' })
    }))

app.route('/chatRooms/lobby')
    .get(handle((req, res, user) => {
        res.status(200).json({ data: { chatRoom: state.chatRooms[lobbyUuid] } })
    }, undefined))
    .patch(handle((req, res, user) => {
        // write message to the lobby
        user.chat('lobby', req.body.text)
        res.status(200).json({ data: { chatRoom: state.chatRooms[lobbyUuid] } })
    }, (req, res) => {
        res.status(403).json({ error: 'sign up to start chatting' })
    }))

app.route('/chatRooms/:id')
    .get(handle((req, res, user) => {
        const chatRoomId = req.params.id
        const chatRoom = state.chatRooms[chatRoomId]

        // get chatRoom data, only if user belongs to the Room
        if (chatRoom.isOwnedBy(user.uuid) || user.isInRoom('chatRoom', chatRoomId)) {
            res.status(200).json({ data: { chatRoom: chatRoom } })
        } else {
            res.status(403).json({ error: 'owner of room has not invited you' })
            // fail
        }
    }, (req, res) => {
        res.status(403).json({ error: 'sign up to start chatting' })
    }))
    .patch(handle((req, res, user) => {
        const chatRoomId = req.params.id
        const chatRoom = state.chatRooms[chatRoomId]
        const messageBody = req.body.text

        // TODO reorganize (check the action at the top level)??
        if (user.ownsRoom(chatRoom)) {
            // owner can add or remove users from the chatRoom and write to messages
            if (messageBody) {
                user.chat(chatRoomId, messageBody)
                res.status(200).json({ data: { chatRoom: state.chatRooms[chatRoomId] } })
            } else if (req.body.action === 'removeUser') {
                user.ejectFromChatRoom(req.body.userId)
                res.status(200).json({ data: { chatRoom: state.chatRooms[chatRoomId] } })
            } else {
                res.status(400).json({ error: 'bad request' })
            }
        } else if (user.isInRoom('chatRoom', chatRoomId)) {
            // other users can write to messages
            if (messageBody) {
                user.chat(chatRoomId, messageBody)
                res.status(200).json({ data: { chatRoom: state.chatRooms[chatRoomId] } })
            } else {
                res.status(400).json({ error: 'bad request' })
            }
        } else {
            res.status(403).json({ error: 'owner of room has not invited you' })
            // fail
        }
    }, (req, res) => {
        res.status(403).json({ error: 'sign up to start chatting' })
    }))

app.route('/gameRooms')
    .get(handle((req, res, user) => {
        if (req.query.userId) {
            if (req.query.userId === user.uuid) {
                // get only the user's gameRooms
                res.status(200).json({ data: { gameRooms: user.getGameRooms() } })
            } else {
                // forbidden to access
                res.status(403).json({ error: 'cannot see another user\'sgame rooms' })
            }
        } else {
            // get a list of all the existing gameRooms (to watch or join)
            res.status(200).json({ data: { gameRooms: state.gameRooms } })
        }
    }, (req, res) => {
        // TODO: anyone can watch a game
        res.status(403).json({ error: 'sign up to see the game rooms' })
    }))
    .post(handle((req, res, user) => {
        // create a gameRoom
        let gameRoom = user.createGameRoom()
        res.status(200).json({ data: { gameRoom: gameRoom } })
    }, (req, res) => {
        res.status(403).json({ error: 'sign up to start playing' })
    }))

app.route('/gameRooms/:id')
    .get(handle((req, res, user) => {
    // gets the gameRoom data
        const gameRoomId = req.params.id
        res.status(200).json({ data: { gameRoom: state.gameRooms[gameRoomId] } })
    }, (req, res) => {
        // TODO: anyone can watch a game
        res.status(403).json({ error: 'sign up to start playing' })
    }))
    .patch(handle((req, res, user) => {
        const gameRoomId = req.params.id
        const gameRoom = state.gameRooms[gameRoomId]
        const action = req.body.action

        if (action === 'addPlayer') {
            if (gameRoom.isOwnedBy(user.uuid)) {
                if (gameRoom.isFull()) {
                    res.status(403).json({ error: 'the room is already full' })
                } else {
                    // add user
                    state.users[req.body.userId].joinGameRoom(gameRoomId)
                    res.status(200).json({ data: { gameRoom: state.gameRooms[gameRoomId] } })
                }
            } else {
                res.status(403).json({ error: 'it isn\'t your game room to add players to' })
            }
        } else if (action === 'play') {
            console.log('PLAYING', gameRoomId)
            if (user.isInRoom('gameRoom', gameRoomId)) {
                if (user.canPlay(gameRoomId)) {
                    // TODO: validate move so users can't cheat
                    let moveIsValid = true
                    if (moveIsValid) {
                        user.play(gameRoomId, req.body.column)
                        console.log(JSON.stringify(state.gameRooms[gameRoomId].board))
                        res.status(200).json({ data: { gameRoom: state.gameRooms[gameRoomId] } })
                    } else {
                        res.status(400).json({ error: 'invalid move' })
                    }
                } else {
                    res.status(403).json({ error: 'not your turn' })
                }
            } else {
                res.status(403).json({ error: 'you aren\'t playing' })
            }
        } else {
            // error
            res.status(400).json({ error: 'unknown action' })
        }
    }, (req, res) => {
        res.status(403).json({ error: 'sign up to start playing' })
    // user can join a Room if it is available
    // if Room has been deleted, return error
    // user can also make a move if it is their turn and if they are a player
    }))
    .delete(handle((req, res, user) => {
        const gameRoomId = req.params.id
        if (state.gameRooms[gameRoomId].isEmpty()) {
            user.deleteGameRoom(gameRoomId)
            res.status(200).json({ data: { } })
        } else {
            // too late, must forfeit
            res.status(403).json({ error: 'you must forfeit to delete this room' })
        }
    }, (req, res) => {
        res.status(403).json({ error: 'sign up to start playing' })
    }))

app.route('/state')
    .get((req, res) => {
        res.status(200).json({data: state})
    })

app.route('/users')
    .get((req, res) => {
        // show number of active users
        res.status(200).json({ data: { users: Object.keys(state.users) } })
    })
    .post(handle((req, res, user) => {
        // if already has JWT, fail
        res.status(400).json({ error: 'user already has token' })
    }, (req, res) => {
        // anyone can play!
        const name = req.body.name
        const color = req.body.color
		console.log(JSON.stringify(req.body))
		console.log(req.get('Content-Type'))
		console.log(name, color)

        // TODO: better form validation (empty string, valid CSS color)
        if (name && color) {
            // sign up, get JWT and add to users data structure
            const uuid = uuidv1()
            const token = jwt.sign({ jti: uuid }, secret)

            const user = new User(uuid, req.body.name, req.body.color, token)
            state.users[uuid] = user

            res.status(200).json({ data: { user: user } })
        } else {
            res.status(400).json({ error: 'name or color are invalid' })
        }
    }))

app.route('/users/:id')
    .get(handle((req, res, user) => {
        const userId = req.params.id 

        if (userId === user.uuid) {
            res.status(200).json({ data: { user: state.users[userId] } })
        } else {
            // hide sensitive data
            res.status(200).json({ data: { user: state.users[userId].publicView() } })
            //res.status(403).json({ error: 'you are not authorized to view user ' + userId })
        }
    }, (req, res) => {
        // no auth
        res.status(400).json({ error: 'please login to get user information' })
    }))
    .patch(handle((req, res, user) => {
        const userId = req.params.id 
        const action = req.body.action

        if (userId === user.uuid) {
            console.log('> changeSettings')
            if (action === 'changeSettings') {
                // change the user's settings
                user.changeSettings(req.body.name, req.body.color)
                res.status(200).json({ data: { user: state.users[userId] } })
            } else if (action === 'acceptChallenge') {
                user.acceptChallenge(req.body.userId, req.body.gameRoomId)
                res.status(200).json({ data: { user: state.users[userId] } })
            } else if (action === 'sendChallenge') {
                res.status(403).json({ error: 'you can\'t challenge yourself' })
            } else {
                res.status(400).json({ error: 'unknown action' })
            }
        } else {
            // user is sending a challenge to this user
            console.log('> challenge:', JSON.stringify(req.body))
            if (req.body.action === 'sendChallenge') {
                // add the requesting user to the requested user's list of challengers
                console.log('> will challenge')
                user.sendChallenge(userId, req.body.gameRoomId)
                console.log('> successful challenge')

                // hide sensitive data
                res.status(200).json({ data: { user: state.users[userId].publicView() } })
            } else if (req.body.action === 'acceptChallenge') {
                res.status(403).json({ error: 'you cannot accept challenge on another\'s behalf' })
            } else if (req.body.action === 'changeSettings') {
                res.status(403).json({ error: 'you are not authorized to change user ' + userId })
            } else {
                res.status(400).json({ error: 'unknown action' })
            }
        }
    }, (req, res) => {
        res.status(403).json({error: 'please login to play'})
    }))
    .delete(handle((req, res, user) => {
        // TODO: implement
        // removes the user after a specified amount of inactivity on the client
    }, (req, res) => {
        // no auth
    }))

const port = process.env.PORT || 4000
app.listen(port, () => console.log('listening at http://localhost:' + port + ' ...'))
