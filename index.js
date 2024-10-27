const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const app = express();
const port = 3000;
// Load users from users.json
const loadUsers = () => {
    const data = fs.readFileSync('users.json');
    return JSON.parse(data);
};
// Middleware for parsing JSON data and serving static files
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Set up session management
app.use(session({
    secret: '678993737', // Replace with your secret key
    resave: false,
    saveUninitialized: true
}));

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${req.session.email}-${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

// Root route redirects to the login page
app.get('/', (req, res) => {
    res.redirect('login.html');
});

// Serve the signup and login pages
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/homepage', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'homepage.html'));
});

// API to handle signup
app.post('/signup', (req, res) => {
    const { name, email, password } = req.body;
    const newUser  = { name, email, password };

    fs.readFile('users.json', 'utf8', (err, data) => {
        if (err) throw err;
        let users = JSON.parse(data);

        // Check if the email already exists
        if (users.some(user => user.email === email)) {
            return res.status(400).json({ message: 'User  already exists' });
        }

        // Add new user
        users.push(newUser );

        // Save the updated users array
        fs.writeFile('users.json', JSON.stringify(users, null, 2), err => {
            if (err) throw err;
            res.status(201).json({ message: 'Account created successfully' });
        });
    });
});

// API to handle login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    fs.readFile('users.json', 'utf8', (err, data) => {
        if (err) throw err;
        const users = JSON.parse(data);

        // Check for matching user credentials
        const user = users.find(user => user.email === email && user.password === password);

        if (user) {
            req.session.email = email; // Save user email in session
            res.json({ message: 'Login successful', redirectUrl: '/homepage' });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    });
});

// API to handle profile setup
app.post('/setup-profile', upload.single('profilePic'), (req, res) => {
    const { username, email, phone, name, about } = req.body;
    const profilePic = req.file ? req.file.filename : null;

    fs.readFile('users.json', 'utf8', (err, data) => {
        if (err) throw err;
        let users = JSON.parse(data);

        // Find the user by email and update their profile
        const userIndex = users.findIndex(user => user.email === email);
        if (userIndex === -1) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update user's profile data
        users[userIndex] = {
            ...users[userIndex],
            username,
            phone,
            name,
            about,
            profilePic: profilePic || users[userIndex].profilePic  // Keep existing profile picture if not updated
        };

        // Save the updated users array
        fs.writeFile('users.json', JSON.stringify(users, null, 2), err => {
            if (err) throw err;
            res.status(200).json({ message: 'Profile updated successfully' });
        });
    });
});


// API to get profile data
app.get('/get-profile', (req, res) => {
    if (!req.session.email) {
        return res.status(401).json({ error: 'User not logged in' });
    }

    fs.readFile('users.json', 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Error reading user data' });
        }

        const users = JSON.parse(data);
        const user = users.find(u => u.email === req.session.email);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Return profile data, including the profile picture
        res.json({
            name: user.name,
            email: user.email,
            phone: user.phone,
            about: user.about,
            profilePic: user.profilePic ? `/uploads/${user.profilePic}` : null
        });
    });
});

// API to fetch users for the news feed
app.get('/newsfeed', (req, res) => {
    fs.readFile('users.json', 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Error reading user data' });
        }

        const users = JSON.parse(data);

        // Filter users who have uploaded profile pictures
        const usersWithProfilePics = users.filter(user => user.profilePic);

        res.json(usersWithProfilePics);
    });
});

// Route to search for a user by name or email
app.get('/search-user', (req, res) => {
    const query = req.query.query.toLowerCase();

    fs.readFile('users.json', 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Error reading user data' });
        }

        const users = JSON.parse(data);
        const user = users.find(u => u.name.toLowerCase() === query || u.email.toLowerCase() === query);

        if (!user) {
            return res.status(404).json({ error: 'User  not found' });
        }

        // Send the user's profile data back to the client
        res.json({
            name: user.name,
            email: user.email,
            phone: user.phone,
            about: user.about,
            profilePic: user.profilePic ? user.profilePic : 'default-profile.png'
        });
    });
});

// API to create a new post
app.post('/create-post', upload.single('image'), (req, res) => {
    const email = req.session.email; // Use session email
    const { text } = req.body;
    const image = req.file ? req.file.filename : null;

    const newPost = {
        email: email,
        text: text,
        image: image,
        createdAt: new Date().toISOString()
    };

    // Read existing posts
    fs.readFile('posts.json', 'utf8', (err, data) => {
        if (err) throw err;
        const posts = JSON.parse(data || '[]');

        // Add new post to posts array
        posts.push(newPost);

        // Save updated posts array
        fs.writeFile('posts.json', JSON.stringify(posts, null, 2), err => {
            if (err) throw err;
            res.json({ success: true, message: 'Post created successfully' });
        });
    });
});

// API to send a message to another user
app.post('/send-message', (req, res) => {
    const { recipientEmail, message } = req.body;
    const senderEmail = req.session.email;

    if (!senderEmail) {
        return res.status(401).json({ error: 'User  not logged in' });
    }

    // Validate recipientEmail
    if (!recipientEmail || !message) {
        return res.status(400).json({ error: 'Recipient email and message are required' });
    }

    const newMessage = {
        senderEmail: senderEmail,
        recipientEmail: recipientEmail,
        message: message,
        timestamp: new Date().toISOString(),
        read: false // Mark the message as unread
    };

    // Read existing messages
    fs.readFile('messages.json', 'utf8', (err, data) => {
        if (err) throw err;
        const messages = JSON.parse(data || '[]');

        // Add new message to messages array
        messages.push(newMessage);

        // Save updated messages array
        fs.writeFile('messages.json', JSON.stringify(messages, null, 2), err => {
            if (err) throw err;

            // Optionally: send notification to the recipient
            console.log(`New message from ${senderEmail} to ${recipientEmail}: ${message}`);
            res.json({ success: true, message: 'Message sent successfully' });
        });
    });
});

// API to get chat messages between users
app.get('/get-chat/:recipientEmail', (req, res) => {
    const senderEmail = req.session.email;
    const recipientEmail = req.params.recipientEmail;

    if (!senderEmail) {
        return res.status(401).json({ error: ' User   not logged in' });
    }

    // Read existing messages
    fs.readFile('messages.json', 'utf8', (err, data) => {
        if (err) throw err;
        const messages = JSON.parse(data || '[]');

        // Filter messages between the sender and the recipient
        const chatMessages = messages.filter(
            message =>
                (message.senderEmail === senderEmail && message.recipientEmail === recipientEmail) ||
                (message.senderEmail === recipientEmail && message.recipientEmail === senderEmail)
        );

        // Mark messages as read when fetched
        chatMessages.forEach(msg => {
            if (msg.recipientEmail === senderEmail) {
                msg.read = true; // Mark as read
            }
        });

        // Save updated messages back to the file
        fs.writeFile('messages.json', JSON.stringify(messages, null, 2), err => {
            if (err) throw err;
        });

        // Send the filtered messages as the chat history
        res.json(chatMessages);
    });
});

// API to find a user by phone number
app.get('/find-user/:phone', (req, res) => {
    const phoneNumber = req.params.phone;
    const users = loadUsers();

    const user = users.find(u => u.phone === phoneNumber);
    if (user) {
        res.json({
            exists: true,
            user: {
                name: user.name,
                email: user.email,
                profilePic: user.profilePic
            }
        });
    } else {
        res.json({ exists: false });
    }
});
// Fetch users for the chat list
app.get('/get-users', (req, res) => {
    fs.readFile('users.json', 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Failed to load users.' });
        const users = JSON.parse(data);
        res.json(users);
    });
});

// Get chat history between two users
const usersFilePath = path.join(__dirname, 'users.json');
const messagesFilePath = path.join(__dirname, 'messages.json');

// Helper function to read JSON files
function readJSONFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath));
}

// API to get chat history for the current user
app.get('/get-chat-history/:email', (req, res) => {
    const email = req.params.email;
    const messages = readJSONFile(messagesFilePath);
    const friends = new Set();

    // Find all unique friends based on chat history
    messages.forEach(msg => {
        if (msg.senderEmail === email) {
            friends.add(msg.recipientEmail);
        } else if (msg.recipientEmail === email) {
            friends.add(msg.senderEmail);
        }
    });

    const users = readJSONFile(usersFilePath);
    const friendsList = users.filter(user => friends.has(user.email));
    
    res.json(friendsList);
});

app.get('/get-friends', (req, res) => {
    const userEmail = req.session.userEmail; // Assuming you're using session to store the logged-in user's email
    // Fetch users from messages.json or database where user has chats with this userEmail
    const friends = []; // Populate this array with user data from your data source

    // Example of fetching friends from messages.json (you should adapt this to your actual logic)
    fs.readFile('messages.json', 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error reading messages file');
        const messages = JSON.parse(data);
        
        // Extract friends
        messages.forEach(message => {
            if (message.senderEmail === userEmail || message.recipientEmail === userEmail) {
                const friendEmail = message.senderEmail === userEmail ? message.recipientEmail : message.senderEmail;
                if (!friends.find(friend => friend.email === friendEmail)) {
                    friends.push({ email: friendEmail, name: friendName, profilePic: friendProfilePic }); // Adjust as necessary
                }
            }
        });
        
        res.json({ friends });
    });
});
// API endpoint to get chat history for the current user

function readMessages() {
    const filePath = path.join(__dirname, 'messages.json');
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
}
// Start the Express server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});