# Architecture, step 3: pattern

Use case: **View Equipment**.

The catalogue uses three patterns together: client-server, layers, and MVC.

The team has 5 people, one semester, and 1000 users. The student waits for one catalogue answer. Client-server, layers, and MVC match that shape. Microservices would split this one request across several programs and databases. Event-driven would answer later, through a broker, instead of returning the list in this request.

## Client-server

The browser asks. One Node.js process answers. The server does not call the browser first.
Every signed-in student sees the same catalogue.

## Layers

The screen calls the API. The API calls the catalogue page, `page.js`.
`page.js` calls login through `currentSession`, then the catalogue and status.
The catalogue and status call storage.
Storage is the only part that opens the database.

## MVC

View: the browser (`app.js`).
Controller: the API and `page.js`.
Model: login, catalogue, status, and storage.

## Trade-off

The database and the layers make the catalogue easier to maintain. Storage can change without rewriting the page, the catalogue, or status.
That extra step slows the answer. This works against Performance.
If the database server is down, the catalogue does not work.
If the Node.js server is down, the catalogue does not work either.
