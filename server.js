express = require('express.io');
app = express();
app.http().io();
cookieParser = require('cookie-parser')

app.use(cookieParser())

var fs = require('fs');
var userFile = __dirname + '/test.json';
var campusFile = __dirname + '/campus.json';

//function readFile(){
fs.readFile(userFile, 'utf8', function (err, data) {    
    if (err) {
        console.log('Error: ' + err);
        return;
    }

    users = JSON.parse(data);

    // remove the basketball from the user inventory if it was there.
    for(var i in users){
        for(var j in users[i].inventory){
            if(users[i].inventory[j] == "basketball"){
                users[i].inventory.splice(j, 1);
                return;
            }
        }
    }
});

fs.readFile(campusFile, 'utf8', function (err, data) {
    if (err) {
        console.log('Error: ' + err);
        return;
    }

    campus = JSON.parse(data);
    campus["allen-fieldhouse"].text = "Rock Chalk! You're at the field house.";
    
    // check to see if basketball is at a location.
    for(var i in campus){
        for(var j in campus[i].what){
            if(campus[i].what[j] == "basketball"){
                return;
            }
        }
    }

    // put basketball back at fraser
    campus["outside-fraser"].what.push("basketball");
});


function writeToFile(file, data){
    var stream = fs.createWriteStream(file);
    stream.once('open', function(fd) {
      //  for(var i in users){
        //    console.log(users[i]);
       // }
        //console.log(JSON.stringify(users));
        stream.write(JSON.stringify(data, null, "\t"));
        stream.end();
    });
}


function saveState(){
    writeToFile(userFile, users);
    writeToFile(campusFile, campus);
}


/*
SUMMARY: Creates a new user with the userid and the default inventory and roomid.
*/
function createUser(userid){
    users[userid] = { "userid": userid.toString(), "inventory": ["laptop"], "roomid": "strong-hall"};
    saveState();
}


/*
SUMMARY: Checks if the request has a userid cookie.
         It will create a new userid cookie and user within are system if not.
next: This is the next function/call that the current request matches in this app.
*/
function createCookieAndUser(req, res, next){
    req.userid = req.cookies.userid;    
    if(req.userid == undefined){
        //console.log(req.cookies.userid);
        req.userid = new Date().getTime();    
    }
    if(users[req.userid] == undefined){
        //req.userid = new Date().getTime();
        res.cookie("userid", req.userid, {maxAge: 1000*60*60*24*365})
        createUser(req.userid);
    }
    next();
}


/*
SUMMARY: will find other users that are currently at the roomid,
         which are not the same as the userid passed in.
roomid: The roomid of the room that needs the users from.
userid: The userid that needs to be ignored in the list.
RETURN: Returns a list of other userid's at the roomid.
*/
function getOtherUsersAt(roomid, userid) {
    var otherUsers = [];
    for (var i in users) {
        if (users[i].roomid == roomid && i != userid) {
            otherUsers.push(users[i]);
        }
    }
    return otherUsers;
}


// Any call to the app this function will be called first.
// This will ensure that the user always has a userid.
app.use(createCookieAndUser);


app.get('/', function(req, res){
    res.status(200);
    res.sendfile(__dirname + "/index.html");
})
/*
SUMMARY: TODO
*/
app.get('/me', function(req, res){
    //console.log(users);
    //console.log(req.userid);
    if(users[req.userid] != undefined){
        res.status(200);
        //console.log(users[req.userid]);
        res.send(users[req.userid]);    
    }
    else {
        res.status(404);
        res.send('Failed to find the user');    
    }
})

/*
SUMMARY: TODO
*/
app.get('/otherUsers', function(req, res){

    if(users[req.userid] != undefined){
        res.status(200);
        res.send(getOtherUsersAt(users[req.userid].roomid, req.userid));
    }    
    else {
        res.status(404);
        res.send('Failed to find the user');
    }
})

/*
SUMMARY: TODO
*/
app.get('/my-inventory', function(req, res){
    if(users[req.userid] != undefined){
        res.set({'Content-Type': 'application/json'});
        res.status(200);
        res.send(users[req.userid].inventory);
        return;
    }
    else{
        res.status(404);
        res.send('Failed to find the user.');    
    }
})

/*
SUMMARY: TODO
*/
app.get('/:room', function(req, res){
    if(campus[req.params.room] != undefined){
        res.set({'Content-Type': 'application/json'});
        res.status(200);
        res.send(campus[req.params.room]);
    }
    else{
        res.status(404);
        res.send('Failed to find the campus location');
    }
})
/*
app.get('/inventory/:userid', function(req, res){
    if(users[req.params.userid] == undefined){
        createUser(req.params.userid);
    }
    res.set({'Content-Type': 'application/json'});
    res.status(200);
    res.send(users[req.params.userid].inventory);
    return;
});
*/

/*
SUMMARY: TODO
*/
app.get('/images/:name', function(req, res){
    res.status(200);
    res.sendfile(__dirname + "/" + req.params.name);
});

/*
app.get('/:room/:userid', function(req, res){
    var response = {};
    
    if(campus[req.params.room] != undefined){
        res.set({'Content-Type': 'application/json'});
        res.status(200);
        response.loc = campus[req.params.room];
        if(users[req.params.userid] == undefined){
            createUser(req.params.userid);        
        }    
        
        // Update this user's location (room)
        users[req.params.userid].room = req.params.room;
        response.users = getOtherUsersAt(req.params.room, req.params.userid);
        res.send(response);
        return;
    }
    res.status(404);
    res.send("not found, sorry");
});
*/

/*
SUMMARY: TODO
*/
app.delete('/:room/:item', function(req, res){
    if(campus[req.params.room] != undefined){
        res.set({'Content-Type': 'application/json'});
        var ix = -1;
        if (campus[req.params.room].what != undefined) {
            ix = campus[req.params.room].what.indexOf(req.params.item);
        }
        if (ix >= 0) {
            res.status(200);
            users[req.userid].inventory.push(campus[req.params.room].what[ix]); // stash
            res.send(users[req.userid].inventory);
            campus[req.params.room].what.splice(ix, 1); // room no longer has this
            saveState();
            return;
        }
        res.status(200);
        res.send([]);
        return;
    }
    res.status(404);
    res.send("location not found");
})

/*
app.delete('/:room/:item/:userid', function(req, res){  
    if(campus[req.params.room] != undefined){
        res.set({'Content-Type': 'application/json'});
        var ix = -1;
        if (campus[req.params.room].what != undefined) {
            ix = campus[req.params.room].what.indexOf(req.params.item);
        }
        if (ix >= 0) {
            res.status(200);
            users[req.params.userid].inventory.push(campus[req.params.room].what[ix]); // stash
            res.send(users[req.params.userid].inventory);
            campus[req.params.room].what.splice(ix, 1); // room no longer has this
            saveState();
            return;
        }
        res.status(200);
        res.send([]);
        return;
    }
    res.status(404);
    res.send("location not found");
});
*/

/*
SUMMARY: TODO
*/
app.delete('/:id/:item/:fromUserid/:toUserid', function(req, res){
    if(users[req.params.fromUserid] == undefined || users[req.params.toUserid] == undefined){
        res.status(404);
        res.send("User couldn't be found");
        return;
    }
    else { 
        var itemid = users[req.params.fromUserid].inventory.indexOf(req.params.item);
        users[req.params.fromUserid].inventory.splice(itemid, 1);
        users[req.params.toUserid].inventory.push(req.params.item);
        saveState();
        res.status(200);
        res.send([]);
        return;
    }
});

/*
SUMMARY: TODO
*/
app.put('/drop/:item', function(req, res){
    var room = users[req.userid].roomid;
    if(campus[room]){
        // Check you have this
        var ix = users[req.userid].inventory.indexOf(req.params.item)
        if (ix >= 0) {
            dropbox(ix,campus[room], req.userid);
            res.set({'Content-Type': 'application/json'});
            saveState();
            res.status(200);
            res.send([]);
        } 
        else {
            res.status(404);
            res.send("you do not have this");
        }
        return;
    }
    res.status(404);
    res.send("location not found");
})

app.listen(3000);

var dropbox = function(ix,room, userid) {
    var item = users[userid].inventory[ix];
    users[userid].inventory.splice(ix, 1); // remove from inventory
    if (room.id == 'allen-fieldhouse' && item == "basketball") {
        room.text += " Someone found the ball so there is a game going on!";
        return;
    }
    if (room.what == undefined) {
        room.what = [];
    }
    room.what.push(item);
}

function changeUserRoom(userid, room_name){
    users[userid].roomid = room_name;
    saveState();
}

/**************
io events
**************/
app.io.route('join-room', function(req){
    if(req.data.room != users[req.data.userid].roomid){
        req.io.leave(users[req.data.userid].roomid);
        app.io.room(users[req.data.userid].roomid).broadcast('myroom', 'Room has change. You should update.');
    }
    req.io.join(req.data.room);
    changeUserRoom(req.data.userid, req.data.room);
    app.io.room(req.data.room).broadcast('myroom', 'Room has changed. You should update.');
})

app.io.route('room-change', function(req){
    app.io.room(req.data.room).broadcast('myroom', 'Room has changed. You should update.');
})

var users = {};

var campus = {
"lied-center": { "id": "lied-center",
    "where": "LiedCenter.jpg",
    "next": {"east": "eaton-hall", "south": "dole-institute"},
    "text": "You are outside the Lied Center."
},
"dole-institute": { "id": "dole-institute",
    "where": "DoleInstituteofPolitics.jpg",
    "next": {"east": "allen-fieldhouse", "north": "lied-center"},
    "text": "You take in the view of the Dole Institute of Politics. This is the best part of your walk to Nichols Hall."
},
"eaton-hall": { "id": "eaton-hall",
    "where": "EatonHall.jpg",
    "next": {"east": "snow-hall", "south": "allen-fieldhouse", "west": "lied-center"},
    "text": "You are outside Eaton Hall. You should recognize here."
},
"snow-hall": { "id": "snow-hall",
    "where": "SnowHall.jpg",
    "next": {"east": "strong-hall", "south": "ambler-recreation", "west": "eaton-hall"},
    "text": "You are outside Snow Hall. Math class? Waiting for the bus?"
},
"strong-hall": { "id": "strong-hall",
    "where": "StrongHall.jpg",
    "next": {"east": "outside-fraser", "north": "memorial-stadium", "west": "snow-hall"},
    "what": ["coffee"],
    "text": "You are outside Stong Hall."
},
"ambler-recreation": { "id": "ambler-recreation",
    "where": "AmblerRecreation.jpg",
    "next": {"west": "allen-fieldhouse", "north": "snow-hall"},
    "text": "It's the starting of the semester, and you feel motivated to be at the Gym. Let's see about that in 3 weeks."
},
"outside-fraser": { "id": "outside-fraser",
    "where": "OutsideFraserHall.jpg",
    "next": {"west": "strong-hall","north":"spencer-museum"},
    "what": ["basketball"],
    "text": "On your walk to the Kansas Union, you wish you had class outside."
},
"spencer-museum": { "id": "spencer-museum",
    "where": "SpencerMuseum.jpg",
    "next": {"south": "outside-fraser","west":"memorial-stadium"},
    "what": ["art"],
    "text": "You are at the Spencer Museum of Art."
},
"memorial-stadium": { "id": "memorial-stadium",
    "where": "MemorialStadium.jpg",
    "next": {"south": "strong-hall","east":"spencer-museum"},
    "what": ["ku flag"],
    "text": "Half the crowd is wearing KU Basketball gear at the football game."
},
"allen-fieldhouse": { "id": "allen-fieldhouse",
    "where": "AllenFieldhouse.jpg",
    "next": {"north": "eaton-hall","east": "ambler-recreation","west": "dole-institute"},
    "text": "Rock Chalk! You're at the field house."
}
}
