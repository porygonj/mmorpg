'use strict';

const User = require('../models/user');

class Client {
    
    constructor(socket, GAME){
        this.socket = socket;
        this.GAME = GAME;
        this.chatCommands = {
            pm (socket, recipient, message) { //console.log('pm');
                let recipientId: string = Object.keys(this.GAME.sockets).find(id => this.GAME.sockets[id].player.name === recipient);
                if (this.GAME.sockets[recipientId]){
                    this.GAME.sockets[recipientId].emit('chatMsg', {
                        name: socket.player.name,
                        msg: message,
                        type: 'private',
                        recipient: this.GAME.sockets[recipientId].player.name
                    });
                    socket.emit('chatMsg', {
                        name: socket.player.name,
                        msg: message,
                        type: 'private',
                        recipient: this.GAME.sockets[recipientId].player.name
                    });
                }
            }
        };
    }
    
    onConnect(){//console.log(this.GAME);
        this.player = this.GAME.create('Player', []);
        //console.log(player);
        this.id = this.player.id;
        //console.log(socket.request);
        if (this.socket.request.user.logged_in && this.socket.request.user.local){
            let user = this.socket.request.user;
            this.player.name = user.local.username;
            this.player.x = user.x;
            this.player.y = user.y;
            this.player.zone = this.GAME.zones['grass'];
        } else {
            this.player.name = 'Guest' + Math.floor(Math.random() * Math.pow(10, 5));
            this.player.zone = this.GAME.zones['grass'];
        }
        this.player.zone.prepare(this);
        this.socketEvents();
    }
    
    onDisconnect(){
        console.log('removed socket');
        if (this.socket.request.user){
            this.saveUser();
        }console.log(this.player);
        this.player.room.leave(this);
    }
    
    socketEvents(){console.log('events');
        this.socket.on('disconnect', () => this.onDisconnect());
        
        this.socket.on('prepComplete', () => this.onPrepComplete());
        
        this.socket.on('chatMsg', data => this.onChatMsg(data));
        
        this.socket.on('clientDebug', data => {
            console.log(data);
        });
        
        this.socket.on('keyDown', data => {
            this.player.keys[data.key] = true;
        });
        
        this.socket.on('keyUp', data => {
            this.player.keys[data.key] = false;
        });
        
        this.socket.on('click', data => {
            this.player.shootBullet(data.x, data.y);
        });
    }
    
    saveUser(){
        User.findOneAndUpdate({
            username: this.socket.request.user.local.username
        }, {
            x: this.player.x,
            y: this.player.y
        }, (err, user) => {
            if (err) throw err;
        });
    }
    
    sendPrepPack(data){
        this.socket.emit('prep', data);
    }
    
    onPrepComplete(){
        this.player.zone.enter(this);
    }
    
    sendInitPack(data){
        this.socket.emit('init', data);
    }
    
    sendUpdate(data){
        this.socket.emit('update', data);
    }
    
    onChatMsg(data){
        let message: strin = data.message;
        if (message.charAt(0) === '/'){
            let inputs = data.substr(1).split(' '); console.log(inputs);
            if (this.chatCommands[inputs[0]]){
                this.chatCommands[inputs[0]].apply(null, [this.socket].concat(inputs.slice(1)));
            }
        } else {
            if (message.length > 0){
                this.player.room.forEachClient(client => client.recieveChatMessage(this.player.name, message, 'normal'));
            }
        }
    }
    
    recieveChatMessage(name, message, type){
        this.socket.emit('chatMsg', {
            name: name,
            msg: message,
            type: type
        });
    }
    
}

module.exports = Client;
