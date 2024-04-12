const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const db = new sqlite3.Database(path.join(__dirname, 'user.db'));
console.log();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(cookieParser());
app.use(session({ secret: 'foo' }));
app.use(bodyParser.urlencoded({ extended: false }));

app.listen(9000, () => {
	console.log('Server is running on http://localhost:9000');
});

app.get('/', (req, res) => {


	if (req.session.username) {
		res.redirect('/dash');
		return;
	}

	if (req.cookies.username && req.cookies.password) {
		req.session.username = req.cookies.username;
		req.session.password = req.cookies.password;
		res.redirect('/dash');
		return;
	}

	if (req.query.username && req.query.password) {
		const userName = req.query.username;
		const password = req.query.password;
		const query = `SELECT * FROM users WHERE name = '${userName}' AND  password = '${password}'`;
		db.all(query, (err, rows) => {
			if (err) {
				console.log(err);
				return res.status(500).send('Internal Server Error');
			}

			if (rows.length === 0) {
				// Register user 
				const insert = `INSERT INTO users (name, password) VALUES ('${userName}', '${password}')`;
				db.run(insert, (err) => {
					if (err) {
						console.log(err);
						return res.status(500).send('Internal Server Error');
					}

					// Set up session 
					req.session.username = userName;
					req.session.password = password;

					// Save session in cookie
					res.cookie('username', userName);
					res.cookie('password', password);
					res.redirect('/dash');
				});
			} else {
				// Set up session 
				req.session.username = userName;
				req.session.password = password;

				// Save session in cookie
				res.cookie('username', userName);
				res.cookie('password', password);
				res.redirect('/dash');
			}
		});
	} else {
		res.render('login');
	}
});


app.get('/dash', (req, res) => {
	if (req.query.username) {
		const userName = req.query.username;
		const query = `SELECT * FROM users WHERE name = '${userName}'`;
		db.all(query, (err, rows) => {
			if (err) {
				console.log(err);
				return res.status(500).send('Internal Server Error');
			}
			if (rows.length > 0) {
				const users = rows.map(row => ({ name: row.name, password: row.password }));
				res.render('dash', { users, username: userName });
				return
			}
		});
	}
	else {
		if (req.session.username) {
			return res.render('dash', { username: req.session.username, users: [] });
		} else {
			return res.redirect('/');
		}
	}
});

app.get('/logout', (req, res) => {
	req.session.destroy();
	res.clearCookie('username');
	res.clearCookie('password');
	res.redirect('/');
});