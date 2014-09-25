var express = require('express');
var app = express();

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

    // check to see if basketball is at a location.
    for(var i in campus){
        for(var j in campus[i].what){
            if(campus[i].what[j] == "basketball"){
                return;
            }
        }
    }

    // put basketball back at fraser
    for(var i in campus){
        if(campus[i].id == "outside-fraser"){
            campus[i].what.push("basketball");
        }
    }
});


function writeToFile(file, data){
    var stream = fs.createWriteStream(file);
    stream.once('open', function(fd) {
      //  for(var i in users){
        //    console.log(users[i]);
       // }
        //console.log(JSON.stringify(users));
        stream.write(JSON.stringify(data));
        stream.end();
    });
}

app.get('/', function(req, res){
    res.status(200);
    res.sendFile(__dirname + "/index.html");
 //   readFile();
});

app.get('/inventory/:userid', function(req, res){
    if(users[req.params.userid] == undefined){
        createUser(req.params.userid);
    }
    res.set({'Content-Type': 'application/json'});
    res.status(200);
    res.send(users[req.params.userid].inventory);
    writeToFile(userFile, users);
    writeToFile(campusFile, campus);
    return;
});

app.get('/images/:name', function(req, res){
    res.status(200);
    res.sendFile(__dirname + "/" + req.params.name);
});

app.get('/:id/:userid', function(req, res){
    var response = {};
    for (var roomid in campus) {
        if (req.params.id == campus[roomid].id) {
            res.set({'Content-Type': 'application/json'});
            res.status(200);
            response.loc = campus[roomid];
            if(users[req.params.userid] == undefined){
                createUser(req.params.userid);
            }

            // Update this user's location (room)
            users[req.params.userid].roomid = roomid;
            response.users = getOtherUsersAt(roomid, req.params.userid);
            res.send(response);

            return;
        }
    }
    res.status(404);
    res.send("not found, sorry");
});

app.delete('/:id/:item/:userid', function(req, res){
    for (var i in campus) {
        if (req.params.id == campus[i].id) {
            res.set({'Content-Type': 'application/json'});
            var ix = -1;
            if (campus[i].what != undefined) {
                ix = campus[i].what.indexOf(req.params.item);
            }
            if (ix >= 0) {
                res.status(200);
                users[req.params.userid].inventory.push(campus[i].what[ix]); // stash
                res.send(users[req.params.userid].inventory);
                campus[i].what.splice(ix, 1); // room no longer has this
                return;
            }
            res.status(200);
            res.send([]);
            return;
        }
    }
    res.status(404);
    res.send("location not found");
});

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
        res.send([]);
    }
});

app.put('/:id/:item/:userid', function(req, res){
    for (var i in campus) {
        if (req.params.id == campus[i].id) {
            // Check you have this
            var ix = users[req.params.userid].inventory.indexOf(req.params.item)
                if (ix >= 0) {
                    dropbox(ix,campus[i], req.params.userid);
                    res.set({'Content-Type': 'application/json'});
                    res.status(200);
                    res.send([]);
                } else {
                    res.status(404);
                    res.send("you do not have this");
                }
            return;
        }
    }
    res.status(404);
    res.send("location not found");
});

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

var users = {};

function createUser(userid){
    users[userid] = { "userid": userid, "inventory": ["laptop"], "roomid": "4"};
}

function getOtherUsersAt(roomid, userid) {
    var otherUsers = [];
    for (var i in users) {
        if (users[i].roomid == roomid && i != userid) {
            otherUsers.push(users[i]);
        }
    }
    return otherUsers;
} 

var campus = [
{ "id": "lied-center",
    "where": "LiedCenter.jpg",
    "next": {"east": "eaton-hall", "south": "dole-institute"},
    "text": "You are outside the Lied Center."
},
{ "id": "dole-institute",
    "where": "DoleInstituteofPolitics.jpg",
    "next": {"east": "allen-fieldhouse", "north": "lied-center"},
    "text": "You take in the view of the Dole Institute of Politics. This is the best part of your walk to Nichols Hall."
},
{ "id": "eaton-hall",
    "where": "EatonHall.jpg",
    "next": {"east": "snow-hall", "south": "allen-fieldhouse", "west": "lied-center"},
    "text": "You are outside Eaton Hall. You should recognize here."
},
{ "id": "snow-hall",
    "where": "SnowHall.jpg",
    "next": {"east": "strong-hall", "south": "ambler-recreation", "west": "eaton-hall"},
    "text": "You are outside Snow Hall. Math class? Waiting for the bus?"
},
{ "id": "strong-hall",
    "where": "StrongHall.jpg",
    "next": {"east": "outside-fraser", "north": "memorial-stadium", "west": "snow-hall"},
    "what": ["coffee"],
    "text": "You are outside Stong Hall."
},
{ "id": "ambler-recreation",
    "where": "AmblerRecreation.jpg",
    "next": {"west": "allen-fieldhouse", "north": "snow-hall"},
    "text": "It's the starting of the semester, and you feel motivated to be at the Gym. Let's see about that in 3 weeks."
},
{ "id": "outside-fraser",
    "where": "OutsideFraserHall.jpg",
    "next": {"west": "strong-hall","north":"spencer-museum"},
    "what": ["basketball"],
    "text": "On your walk to the Kansas Union, you wish you had class outside."
},
{ "id": "spencer-museum",
    "where": "SpencerMuseum.jpg",
    "next": {"south": "outside-fraser","west":"memorial-stadium"},
    "what": ["art"],
    "text": "You are at the Spencer Museum of Art."
},
{ "id": "memorial-stadium",
    "where": "MemorialStadium.jpg",
    "next": {"south": "strong-hall","east":"spencer-museum"},
    "what": ["ku flag"],
    "text": "Half the crowd is wearing KU Basketball gear at the football game."
},
{ "id": "allen-fieldhouse",
    "where": "AllenFieldhouse.jpg",
    "next": {"north": "eaton-hall","east": "ambler-recreation","west": "dole-institute"},
    "text": "Rock Chalk! You're at the field house."
}
]
