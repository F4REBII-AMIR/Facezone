document.getElementById('signup-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const user = { name, email, password };

    fetch('users.json')
        .then(response => response.json())
        .then(data => {
            data.push(user);
            return fetch('users.json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        })
        .then(() => {
            alert('Signup successful!');
            window.location.href = 'login.html';
        });
});

document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    fetch('users.json')
        .then(response => response.json())
        .then(users => {
            const user = users.find(user => user.email === email && user.password === password);
            if (user) {
                alert('Login successful!');
                window.location.href = 'homepage.html'; // Redirect to homepage
            } else {
                alert('Invalid email or password');
            }
        });
});