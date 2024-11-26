const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;
const SALT_ROUNDS = 10;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
    session({
        secret: "replace_this_with_a_secure_key",
        resave: false,
        saveUninitialized: true,
    })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const USERS = [
    {
        id: 1,
        username: "AdminUser",
        email: "admin@example.com",
        password: bcrypt.hashSync("admin123", SALT_ROUNDS), //In a database, you'd just store the hashes, but for 
                                                            // our purposes we'll hash these existing users when the 
                                                            // app loads
        role: "admin",
    },
    {
        id: 2,
        username: "RegularUser",
        email: "user@example.com",
        password: bcrypt.hashSync("user123", SALT_ROUNDS),
        role: "user", // Regular user
    },
];

// GET /login - Render login form
app.get("/login", (request, response) => {
    response.render("login");
});

// POST /login - Allows a user to login
app.post("/login", async (request, response) => {
    const { email, password } = request.body;
    const user = USERS.find((u) => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        // Render login page with an error message
        return response.render("login", { error: "Invalid email or password" });
    }

    // Store user details in session
    request.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
    };

    response.redirect("/landing");
});

// GET /signup - Render signup form
app.get("/signup", (request, response) => {
    response.render("signup");
});

// POST /signup - Allows a user to signup
app.post("/signup", async (request, response) => {
    const { username, email, password } = request.body;

    // Check if the email is already registered
    const existingUser = USERS.find((u) => u.email === email);
    if (existingUser) {
        console.log("Attempt to register with existing email:", email);
        return response.render("signup", { error: "Email is already registered" });
    }

    // Hash the password and add the new user to USERS
    try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const newUser = {
            id: USERS.length + 1,
            username,
            email,
            password: hashedPassword,
            role: "user", // Default role
        };
        USERS.push(newUser);

        console.log("New user added:", newUser);
        response.redirect("/login");
    } catch (error) {
        console.error("Error hashing password:", error);
        response.render("signup", { error: "Something went wrong. Please try again." });
    }
});

// GET /logout - Render logout form
app.get("/logout", (request, response) => {
    request.session.destroy(() => {
        response.redirect("/");
    });
});



// GET / - Render index page or redirect to landing if logged in
app.get("/", (request, response) => {
    if (request.session.user) {
        return response.redirect("/landing");
    }
    response.render("index");
});

// GET /landing - Shows a welcome page for users, shows the names of all users if an admin
app.get("/landing", (request, response) => {
    if (!request.session.user) {
        return response.redirect("/login");
    }

    if (request.session.user.role === "admin") {
        // Show all users for admin
        return response.render("landing", {
            user: request.session.user,
            users: USERS,
        });
    }

    // Show dashboard for regular users
    response.render("landing", { user: request.session.user });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
