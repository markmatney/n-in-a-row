const chakram = require('chakram'),
    expect = chakram.expect,

    get = chakram.get,
    post = chakram.post,
    patch = chakram.patch,
    del = chakram.delete

describe('API', function() {

    const host = 'http://localhost:4000'
    let user1,
        user2,
        user3

    let aGameRoomId

    /*
     * Helper function that generates objects containing an Authorization header.
     */
    function getAuthHeader(token) {
        // TODO: remove this crap
        if (token.hasOwnProperty('token')) {
            return { headers: { Authorization: 'Bearer ' + token.token } }
        }
        return { headers: { Authorization: 'Bearer ' + token } }
    }

    describe('/users', function() {

        describe('Unauthorized clients', function() {

            it('can sign up', function() {

                // get three users
                let r1 = post(host + '/users', {name: 'mark', color: 'red'})
                let r2 = post(host + '/users', {name: 'calvin', color: 'green'})
                let r3 = post(host + '/users', {name: 'nick', color: 'blue'})

                return Promise.all([
                    expect(r1).to.have.json('data.user', function(user) {
                        user1 = user
                    }),
                    expect(r2).to.have.json('data.user', function(user) {
                        user2 = user
                    }),
                    expect(r3).to.have.json('data.user', function(user) {
                        user3 = user
                    })
                ])
            })
        })

        describe('Authorized clients', function() {

            it('can view their settings', function() {

                let r1 = get(host + '/users/' + user1.uuid, getAuthHeader(user1.token))
                let r2 = get(host + '/users/' + user2.uuid, getAuthHeader(user2.token))
                let r3 = get(host + '/users/' + user3.uuid, getAuthHeader(user3.token))

                return Promise.all([
                    expect(r1).to.have.json('data.user.name', 'mark'),
                    expect(r1).to.have.json('data.user.color', 'red'),

                    expect(r2).to.have.json('data.user.name', 'calvin'),
                    expect(r2).to.have.json('data.user.color', 'green'),

                    expect(r3).to.have.json('data.user.name', 'nick'),
                    expect(r3).to.have.json('data.user.color', 'blue')
                ])
            })

            it('can edit their settings', function() {

                let r = patch(host + '/users/' + user1.uuid, {action: 'changeSettings', name: 'frank', color: ''}, getAuthHeader(user1.token))

                // TODO: set user
                return Promise.all([
                    expect(r).to.have.json('data.user.name', 'frank'),
                    expect(r).to.have.json('data.user.color', 'red')
                ])
            })

            it('cannot POST to /users', function() {

                let r = post(host + '/users', {name: 'whatever', color: 'whatever'}, getAuthHeader(user2.token))

                return expect(r).to.have.json('error', function() {})
            })
        })
    })

    describe('/gameRooms', function() {

        describe('Unauthorized clients', function() {

            it('cannot create game rooms', function() {

                let r1 = post(host + '/gameRooms', {})
                let r2 = post(host + '/gameRooms', {}, getAuthHeader('<invalid-token>'))

                return Promise.all([
                    expect(r1).to.have.json('error', function() {}),
                    expect(r2).to.have.json('error', function() {})
                ])
            })
        })

        describe('Authorized clients', function() {

            it('can create game rooms', function() {

                // user1 creates one game room
                let r1 = post(host + '/gameRooms', {}, getAuthHeader(user1.token))

                // user2 creates two game rooms
                let r2 = post(host + '/gameRooms', {}, getAuthHeader(user2.token))
                    .then(function() {
                        let r3 = post(host + '/gameRooms', {}, getAuthHeader(user2.token))
                        return r3
                    })

                return Promise.all([
                    /*
                    expect(r1).to.have.json('data.user.gameRooms', function(gameRooms) {
                        expect(gameRooms).to.have.lengthOf(1)
                    }),
                    */
                    expect(r1).to.have.json('data.gameRoom', function(gameRoom) {
                        expect(gameRoom.users.shift()).to.equal(user1.uuid)
                    }),

                    // TODO move to a callback that GETs user after doing a POST to gameRooms
                    /*
                    expect(r2).to.have.json('data.user.gameRooms', function(gameRooms) {
                        expect(gameRooms).to.have.lengthOf(2)
                    }),
                    */
                    expect(r2).to.have.json('data.gameRoom', function(gameRoom) {
                        expect(gameRoom.users.shift()).to.equal(user2.uuid)
                        //expect(gameRoom.users.shift()).to.equal(user2.uuid)
                    })
                ])
            })

            it('can view game rooms', function() {

                let r1 = get(host + '/gameRooms', getAuthHeader(user1.token))
                let r2 = get(host + '/gameRooms?userId=' + user1.uuid, getAuthHeader(user1.token))
                let r3 = get(host + '/gameRooms?userId=' + user2.uuid, getAuthHeader(user2.token))

                return Promise.all([
                    expect(r1).to.have.json('data.gameRooms', function(gameRooms) {
                        expect(Object.keys(gameRooms)).to.have.lengthOf(3)
                    }),
                    expect(r2).to.have.json('data.gameRooms', function(gameRooms) {
                        expect(Object.keys(gameRooms)).to.have.lengthOf(1)
                    }),
                    expect(r3).to.have.json('data.gameRooms', function(gameRooms) {
                        expect(Object.keys(gameRooms)).to.have.lengthOf(2)
                    })
                ])
            })

            it('can send challenges to game room owners', function() {
                // TODO: clean up
                let r1 = get(host + '/gameRooms', getAuthHeader(user1.token))
                    .then(function(response) {

                        aGameRoomId = Object.keys(response.body.data.gameRooms).reduce(function(acc, cur) {
                            if (response.body.data.gameRooms[acc].owner !== user1.uuid) {
                                return acc
                            } else if (response.body.data.gameRooms[cur].owner !== user1.uuid) {
                                return cur
                            }
                        })

                        // user 1 challenges user 2
                        let r2 = patch(host + '/users/' + user2.uuid, {action: 'sendChallenge', gameRoomId: aGameRoomId }, getAuthHeader(user1.token))
                        return expect(r2).to.have.json('data.user', function() {})
                    })
                return r1
            })

            it('can accept challenges from challengers', function() {
                // user1 challenges user2
                // first user1 get user2 gameRooms
                /*
                let r1 = patch(host + '/users/' + user2.uuid, getAuthHeader(user2))
                    .then(function(response) {
                        expect(response).to.have.json('data.user', function
                        */
                // user gets their info
                
                // user 2 gets their info
                // user 2 accepts challenge, then adds user 1 to the game room
                let r1 = patch(host + '/users/' + user2.uuid, { action: 'acceptChallenge', userId: user1.uuid, gameRoomId: aGameRoomId }, getAuthHeader(user2))
                    .then(function(response) {

                        let r2 = patch(host + '/gameRooms/' + aGameRoomId, { action: 'addPlayer', userId: user1.uuid }, getAuthHeader(user2))

                        return Promise.all([
                            expect(response).to.have.json('data.user', function() {}),
                            expect(r3).to.have.json('data.gameRoom', function(gameRoom) {
                                expect(gameRoom.users).to.have.lengthOf(2)
                                //expect().to.equal(user1.uuid)
                                //expect().to.include(user.challenges[0].gameRoomId)
                            })
                        ])
                    })
            })

            xit('can leave an empty game room', function() {

            })

            xit('cannot leave an unempty game room', function() {

            })

            it('can play if it is their turn', function() {
                let r1 = patch(host + '/gameRooms/' + aGameRoomId, { action: 'play', column: 0 }, getAuthHeader(user2))
                    .then(function(response) {
                        return Promise.all([
                            expect(response).to.have.json('data.gameRoom', function(gameRoom) {
                                const boardState = gameRoom.board.state;
                                expect(boardState[0]).to.have.lengthOf(1)
                                for (let i = 1; i < gameRoom.board.cols; i++) {
                                    expect(boardState[i]).to.have.lengthOf(0)
                                }
                            })
                        ])
                    })

            })

            it('cannot play when it is not their turn', function() {
                let r1 = patch(host + '/gameRooms/' + aGameRoomId, { action: 'play', column: 0 }, getAuthHeader(user2))
                    .then(function(response) {
                        return Promise.all([
                            expect(response).to.have.json('data.error', function() {})
                        ])
                    })
            })
        })
    })

    xdescribe('/chatRooms', function() {

        describe('Unauthorized clients', function() {

            it('cannot create chat rooms', function() {

            })
        })

        describe('Authorized clients', function() {

            it('can create chat rooms', function() {

            })

            it('can invite other authorized clients to an owned chat room', function() {

            })

            it('cannot join chat rooms without invite', function() {

            })

            it('can join chat rooms by invitation', function() {

            })
        })
    })
})
