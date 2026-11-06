CLOUD BY DAY — VERSION 2

FILES
- index.html: website structure and page content
- style.css: visual styling and responsive layout
- app.js: quiz, scoring, review, section mixing, theme choice and local progress functionality
- question-bank.json: the 144-question course bank

RUN LOCALLY
Because the question bank is loaded with fetch(), do not open index.html by double-clicking it (file://). Run a small local web server from this folder instead.

If Python is installed:
  python -m http.server 8000

Then open:
  http://localhost:8000

Alternatively, use the existing Nginx web server on the EC2 instance after testing locally.

VERSION 2 UPDATES
- Select one, several or all eight course sections for a mixed quiz.
- Questions and answer options are shuffled for each session.
- Choose Light mode or Dark mode with the header toggle; the choice is saved in this browser.
- Increased body, question, answer and supporting text sizes and improved contrast.

PROGRESS
Progress is saved in this browser using localStorage. It does not sync between devices or browsers. Reset progress is available on the page.

SCOPE
Static HTML, CSS and vanilla JavaScript. No framework, backend, database, login or paid service required.
