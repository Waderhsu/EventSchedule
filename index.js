// YOU CAN USE THIS FILE AS REFERENCE FOR SERVER DEVELOPMENT

// include the express modules
var express = require("express");

// create an express application
var app = express();
const url = require('url');

// helps in extracting the body portion of an incoming request stream
var bodyparser = require('body-parser'); // this has been depricated, is now part of express...

// fs module - provides an API for interacting with the file system
// var fs = require("fs");

// helps in managing user sessions
var session = require('express-session');

// include the mysql module
var mysql = require("mysql");

// Bcrypt library for comparing password hashes
const bcrypt = require('bcrypt');

// A possible library to help reading uploaded file.
// var formidable = require('formidable');
const path = require('path');

// apply the body-parser middleware to all incoming requests
app.use(bodyparser());

// use express-session
// in mremory session is sufficient for this assignment
app.use(session({
  secret: "csci4131secretkey",
  saveUninitialized: true,
  resave: false
}
));

const dbCon = mysql.createPool({
  host: "cse-mysql-classes-01.cse.umn.edu",
  user: "C4131S24DU43",               // replace with the database user provided to you
  password: "1899",                  // replace with the database password provided to you
  database: "C4131S24DU43",           // replace with the database user provided to you
  port: 3306
});

// server listens on port 9007 for incoming connections
app.listen(9007, () => console.log('Listening on port 9007!'));


// function to return the welcome page
app.get('/', function (req, res) {
  // res.sendFile(__dirname + '/static/html/welcome.html');
  res.render(__dirname + '/static/html/welcome.pug');
});

app.get('/welcome', function (req, res) {
  // res.sendFile(__dirname + '/static/html/welcome.html');
  res.render(__dirname + '/static/html/welcome.pug');
});

// function to return the login page
app.get('/login', function (req, res) {
  if (req.session.username) {
    return res.redirect('/schedule');
  }
  // res.sendFile(__dirname + '/static/html/login.html');
  res.render(__dirname + '/static/html/login.pug');
});

// handle login form submission
app.post('/login', function (req, res) {
  const { username, password } = req.body;

  dbCon.getConnection(function (err, connection) {
    if (err) {
      console.error('Error connecting to database: ' + err.stack);
      return res.status(500).send('Internal Server Error');
    }

    const sql = 'SELECT * FROM tbl_accounts WHERE acc_login = ?';
    connection.query(sql, [username], function (err, results) {
      connection.release();

      if (err) {
        console.error('Error executing query: ' + err.stack);
        return res.status(500).send('Internal Server Error');
      }

      if (results.length === 0 || !bcrypt.compareSync(password, results[0].acc_password)) {
        return res.status(401).json({ success: false, message: 'Invalid username or password.' });
      }

      // Store the username in session
      req.session.username = username;
      res.json({ success: true });
    });
  });
});

// function to return the schedule page
app.get('/schedule', function (req, res) {
  // If user is not logged in, redirect to the login page
  if (!req.session.username) {
    return res.redirect('/login');
  }
  // res.sendFile(__dirname + '/static/html/schedule.html');
  res.render(__dirname + '/static/html/schedule.pug');
});

// function to return the schedule page
app.get('/addEvent', function (req, res) {
  // If user is not logged in, redirect to the login page
  if (!req.session.username) {
    return res.redirect('/login');
  }
  // res.sendFile(__dirname + '/static/html/addEvent.html');
  res.render(__dirname + '/static/html/addEvent.pug');
});

app.get('/events', (req, res) => {
  const day = req.query.day;
  console.log(day);
  dbCon.query('SELECT * FROM tbl_events WHERE event_day = ? ORDER BY event_start', [day], (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

app.post('/postEventEntry', (req, res) => {
  const eventData = req.body;
  // console.log(eventData);
  dbCon.query('INSERT INTO tbl_events SET ?', eventData, (error, results) => {
    if (error) throw error;
    res.redirect('/schedule');
  });
});

// function to logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.log(err);
    } else {
      res.redirect('/login');
    }
  });
});

// Handle file upload
// Handle file upload
app.post('/uploadFile', (req, res) => {
  const form = new formidable.IncomingForm();

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Error parsing form:', err);
      return res.status(500).send('Internal Server Error');
    }
    // Check if the files object contains the htmlFile field
    if (!files.htmlFile) {
      console.error('No htmlFile field found in the form data');
      return res.status(400).send('No htmlFile field found in the form data');
    }
    const uploadFilePath = files.htmlFile[0].filepath;
    // const schedulePath = __dirname + '/static/html/schedule.pug';
    const uploadFile = fs.readFileSync(uploadFilePath, { encoding: 'utf8', flag: 'r' });
    // var oriFile = fs.readFileSync(schedulePath, { encoding: 'utf8', flag: 'r' });

    const newEvents = uploadFile.substring(uploadFile.search("<tbody>") + 7, uploadFile.search("</tbody>"));
    var day = uploadFile.split('nav-link active')[2];
    day = day.substring(day.search('onclick="formTable(this)') + 29, day.search("</a>"));

    if (newEvents.length > 0) {
      const event = newEvents.split('</tr>');
      for (let i = 0; i < event.length - 1; i++) {
        event[i] = event[i].substring(4);
        const newEventArray = event[i].split("</td><td>");
        newEventArray[0] = newEventArray[0].substring(4);

        var eventData = {
          event_event: newEventArray[0],
          event_day: day,
          event_start: newEventArray[1].substring(0, 5),
          event_end: newEventArray[1].substring(10),
          event_phone: newEventArray[3],
          event_location: newEventArray[2],
          event_info: newEventArray[4].substring(newEventArray[4].search("http"), newEventArray[4].search('">')),
          event_url: newEventArray[4].substring(newEventArray[4].search(">") + 1, newEventArray[4].search("</a>"))
        };
        console.log(eventData);
        dbCon.query('INSERT INTO tbl_events SET ?', eventData, (error, results) => {
          if (error) throw error;
        });
      }
      res.redirect('/schedule');
      //   if (oriFile.includes("addEvent")) {
      //     oriFile = oriFile;
      //   } else {
      //     oriFile = oriFile + '\n' +
      //       'function addEvent() { \n' +
      //       'const tableBody = $("#scheduleTable tbody");\n' +
      //       'tableBody.append(' + newEvents + ');\n' +
      //       '};\n' +
      //       'addEvent();';
      //   }

      //   // oriFile.substring(0, oriFile.search("tbody") + 5) + newEvents + oriFile.substring(oriFile.search("</tbody>"));
      //   console.log(newEvents);
      //   console.log("oriFile" + oriFile);

      //   // add upload file to schedule.pug
      //   fs.writeFile('schedule.pug', oriFile, (err) => {
      //     if (err) {
      //       throw err;
      //     }
      //     console.log('Event added successfully.');
      //   });
    }

  });
});

// Serve the uploaded HTML file
app.get('/uploadedHtml', (req, res) => {
  // Assuming you have stored the uploaded HTML file in 'uploadedFiles' directory
  const filePath = path.join(__dirname, 'uploadedFiles', 'schedule.html');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return res.status(500).send('Internal Server Error');
    }
    res.send(data);
  });
});

// Handle DELETE request to delete an event
app.delete('/deleteEvent/:eventId', (req, res) => {
  const eventId = req.params.eventId;

  // Check if the event exists
  dbCon.query('SELECT * FROM tbl_events WHERE event_id = ?', [eventId], (error, results) => {
    if (error) {
      console.error('Error checking event existence:', error);
      return res.status(500).send('Internal Server Error');
    }

    if (results.length === 0) {
      // Event with the specified ID doesn't exist
      return res.status(404).send('Event not found');
    }

    // Event exists, proceed with deletion
    dbCon.query('DELETE FROM tbl_events WHERE event_id = ?', [eventId], (deleteError, deleteResults) => {
      if (deleteError) {
        console.error('Error deleting event:', deleteError);
        return res.status(500).send('Internal Server Error');
      }

      // Deletion successful
      res.status(200).send('Event deleted successfully');
    });
  });
});

// Handle GET request for the edit page
app.get('/schedule/edit/:eventId', (req, res) => {
  if (!req.session.username) {
    return res.redirect('/login');
  }
  const eventId = req.params.eventId;

  // Fetch event details from the database
  dbCon.query('SELECT * FROM tbl_events WHERE event_id = ?', [eventId], (error, results) => {
    if (error) {
      console.error('Error fetching event details:', error);
      return res.status(500).send('Internal Server Error');
    }

    if (results.length === 0) {
      // Event with the specified ID doesn't exist
      return res.status(404).send('Event not found');
    }

    // Render the edit page with event details
    res.render(__dirname + '/static/html/editEvent.pug', { event: results[0] });
    // res.render('editEvent', { event: results[0] });
  });
});

// Handle POST request to update event details
app.post('/schedule/edit/:eventId', (req, res) => {
  const eventId = req.params.eventId;
  const eventData = req.body;

  // Update the event in the database
  dbCon.query('UPDATE tbl_events SET ? WHERE event_id = ?', [eventData, eventId], (error, results) => {
    if (error) {
      console.error('Error updating event:', error);
      return res.status(422).send('Failed to update event');
    }

    // Event updated successfully, redirect to schedule page
    res.redirect('/schedule');
  });
});

// GET request to render the account creation page
app.get('/createAccount', function (req, res) {
  // If user is already logged in, redirect to the main schedule page
  if (req.session.username) {
    return res.redirect('/schedule');
  }
  res.render(__dirname + '/static/html/new_account.pug');
});

// POST request to handle account creation
app.post('/createAccount', function (req, res) {
  const { email, password, confirm_password } = req.body;

  // Check if password and confirm password match
  if (password !== confirm_password) {
    return res.render(__dirname + '/static/html/new_account.pug', { errorMessage: "Passwords do not match" });
  }

  // Check if email is already registered
  dbCon.getConnection(function (err, connection) {
    if (err) {
      console.error('Error connecting to database: ' + err.stack);
      return res.status(500).send('Internal Server Error');
    }

    const sqlCheckEmail = 'SELECT * FROM tbl_accounts WHERE acc_login = ?';
    connection.query(sqlCheckEmail, [email], function (err, results) {
      if (err) {
        console.error('Error executing query: ' + err.stack);
        connection.release();
        return res.status(500).send('Internal Server Error');
      }

      // If email already exists, return error message
      if (results.length > 0) {
        connection.release();
		  // return res.status(409).send('Email already exists');
        return res.render(__dirname + '/static/html/new_account.pug', { errorMessage: "Email already exists" });
      }

      // If email is new, insert into database
      const hashedPassword = bcrypt.hashSync(password, 10);
      const sqlInsertAccount = 'INSERT INTO tbl_accounts (acc_login, acc_password) VALUES (?, ?)';
      connection.query(sqlInsertAccount, [email, hashedPassword], function (err, results) {
        connection.release();
        if (err) {
          console.error('Error executing query: ' + err.stack);
          return res.status(500).send('Internal Server Error');
        }
			
		  // alert("Create new account!");
        // Log the user in and redirect to the main schedule page
        req.session.username = email;
        res.redirect('/schedule');
      });
    });
  });
});


// middle ware to serve static files
app.use('/static', express.static(__dirname + '/static'));


// function to return the 404 message and error to client
app.get('*', function (req, res) {
  // add details
  res.sendStatus(404);
});
