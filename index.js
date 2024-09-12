const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const env = dotenv.config();
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');

const app =express();

const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
var currentplayer = 'w';

app.set('view engine','hbs');
app.use(express.static(path.join(__dirname,'public')));

app.get('/',(req,res)=>{
    res.render('index',{title: "Chess Game"});
});

io.on("connection", (uniquesocket)=>{
    console.log("Connected");

    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit('playerRole','w');
    }
    else if(!players.black){
        players.black = uniquesocket.id;
        uniquesocket.emit('playerRole','b');
    }else{
        uniquesocket.emit('spectatorRole');
    }

    uniquesocket.on("move",(move)=>{
        try {
            if (chess.turn() === 'w' && uniquesocket.id !== players.white) {
                uniquesocket.emit("wrongTurn", { message: "It's not your turn. Wait for white." });    
                return;
            };
            if (chess.turn() === 'b' && uniquesocket.id !== players.black) {
                uniquesocket.emit("wrongTurn", { message: "It's not your turn. Wait for black." });    
                return;
            };
          
            // // Store the current state
            // const previousFEN = chess.fen();
            const result = chess.move(move);
            
            if(result){

                // // Check if the king is still in check after the move
                // if (chess.inCheck()) {
                //     // Revert the move if the king is still in check
                //     chess.load(previousFEN);
                //     uniquesocket.emit("invalidMove", { message: "You are in check! This move does not resolve the check." });
                //     return;
                // }

                currentplayer = chess.turn();
                io.emit("move",move);
                io.emit("boardState", chess.fen());

                if(chess.isGameOver()){
                    io.emit("gameOver", { message: "Game Over. " + (chess.isCheckmate() ? "Checkmate!" : "Draw!") });
                }
            }else{
                console.log("Invalid Move:", move);
                uniquesocket.emit("invalidMove", {message:"Invalid Move."});
            }
        } catch (err) {
            console.log(err);
            uniquesocket.emit("invalidMove", {message:"Invalid Move.2"});
        }
    })

    uniquesocket.on("disconnect",()=>{
        if(uniquesocket.id == players.white){
            delete players.white;
        }else if(uniquesocket.id == players.black){
            delete players.black;
        }
    })
});

const PORT = process.env.PORT || 5000;
server.listen(PORT,()=>{
    console.log("Server is listening to http://localhost:"+process.env.port);
});
