import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import { configDotenv } from "dotenv";

const app = express();
const port = 3000;

configDotenv()

const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

db.connect();

let books = [];

app.use(bodyParser.urlencoded({extended: "true"}));
app.use(express.static("public"));

app.get("/", async (req, res) => {
    try {
        const result =  await db.query(`SELECT * FROM books ORDER BY id ASC`);
        books = result.rows;
        console.log(books);
        res.render("index.ejs", {
            books: books
        });
    } catch (error) {
        console.log(error);
    }
    
});

app.post("/sort", async (req, res) => {
    try {
        console.log(req.body.sort);
        const sort = req.body.sort;
        const result = await db.query(`SELECT * FROM books ${sort}`);
        console.log(result);
        books = result.rows;
        res.render("index.ejs", {
            books: books
        });
        console.log(req.path);
    } catch (error) {
        console.log(error);
    }
    
})

app.get("/addnewbook", (req, res) => {
    res.render("newbook.ejs");
})

app.post("/addnewbook/add", async (req, res) => {
    try {
        console.log(req.body);
        let input = [req.body.bookTitle, req.body.rating, req.body.description, req.body.authorName]
        const note = req.body.notes;
        const result = await db.query("INSERT INTO books (title, rating, description, author) VALUES (($1), ($2), ($3), ($4)) RETURNING id", input);
        const bookId = result.rows[0].id;
        await db.query("INSERT INTO notes (book_id, note) VALUES (($1), ($2))", [bookId, note]);
        console.log(result.rows);
        res.redirect("/");
    } catch (error) {
        console.log(error);
    }
    
});

app.get("/book/:id", async (req, res) => {
    const id = req.params.id;
    console.log(req.params.id);
    try {
        const result = await db.query("SELECT notes.id AS note_id, books.id, title, description, book_id, note,  author FROM books JOIN notes ON notes.book_id = books.id WHERE books.id = ($1)", [id]);
        console.log(result.rows);
        books = result.rows;
        if (books.length > 0) {
          res.render("book.ejs", {
            books: books
        });   
        } else {
            console.log("no notes");
            console.log(req.params.id)
            const bookId = req.params.id;
            const result = await db.query("SELECT * FROM books WHERE id = ($1)", [bookId]);
            books = result.rows;
            res.render("book.ejs", {
                books: books,
                error: "There are no notes yet, be the first to post.",
                bookId: bookId
            });
        }
        
    } catch (error) {
        console.log("error");
        console.log(error);
    }
    
});

app.post("/book/addnote", async (req, res) => {
    try {
        const id = req.body.bookId;
        console.log(req.path);
        console.log(req.body.newNote);
        await db.query("INSERT INTO notes (book_id, note) VALUES (($1), ($2))", [id, req.body.newNote]);
        res.redirect(`/book/${id}`);
    } catch (error) {
        console.log(error)
    }
    
});

app.post("/note/delete/:bookId", async (req, res) => {
    try {
        await db.query("DELETE FROM notes WHERE id = ($1)", [req.body.selectedNote]);
        res.redirect(`/book/${req.body.bookId}`); 
    } catch (error) {
        console.log(error);
    }
    
});

app.post("/note/:id", async (req, res) => {
    try {
        console.log(req.body.editedNote);
        console.log(req.params.id);
        const input = [req.body.editedNote, req.params.id]
        console.log(req.path);
        const result = await db.query("UPDATE notes SET note = ($1) WHERE id = ($2) RETURNING id, note, book_id", input);
        console.log(result.rows);
        const editedBookId = result.rows[0].book_id;
        res.redirect(`/book/${editedBookId}`);
    } catch (error) {
        console.log(error);
    }
    
})
    

app.listen(port, () => {
    console.log(`listening on port ${port}`);
})

