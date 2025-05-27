require('dotenv').config()
const bodyParser = require('body-parser')
const express = require('express')
const haversineDistance = require('haversine-distance')
const mysql = require('mysql2')

const app = express()
app.use(bodyParser.urlencoded())
app.use(bodyParser.json())

const db = mysql.createConnection({
    host: process.env.HOST,
    password: process.env.PASSWORD,
    user: process.env.USER,
    database: process.env.DATABASE
})

db.connect(function (err) {
    if (err) {
        throw err;
    }
    console.log("connected!!");
})

app.post('/addSchool', (req, res) => {
    const { name, address, latitude, longitude } = req.body;
    console.log(name);
    if (!name || !address || latitude == undefined || longitude == undefined) {
        return res.status(400).json({ error: "please Fill every detail." });
    }
    if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: "the coordinates must be numbers." });
    }
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
        return res.status(400).json({ error: "invalid coordinates." });
    }
    db.query(
        'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)',
        [name, address, latitude, longitude],
        function (err, result) {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ error: "Failed to add school" });
            }
            res.status(201).json({ message: "School added successfully", schoolId: result.insertId });
        });
})

app.get('/listSchools', async (req,res) => {
    const {latitude, longitude} = req.query;
    if(!latitude || !longitude){
        return res.status(400).json({error : "Please provide details of coordinates."});
    }
    const userLatitude = parseFloat(latitude);
    const userLongitude = parseFloat(longitude);
    if(isNaN(userLatitude) || isNaN(userLongitude)){
        return res.status(400).json({error : "Coordinates must be numbers."});
    }
    db.query("SELECT * FROM schools",(err, schools) => {
        if(err){
            console.error(`error in get request : ${err}`);
            return res.status(500).json({error : "Failed to school data."});
        }
        const schoolsMap = schools.map(school => {
            const dist = haversineDistance(
                {lat: userLatitude, lng: userLongitude},
                {lat: school.latitude, lng: school.longitude}
            )/1000;
            return {...school, dist};
        });
        schoolsMap.sort((a,b) => (a.dist - b.dist));
        res.send(schoolsMap);
    })
});

app.listen(3000, () => {
    console.log("server listening on port 3000");
});