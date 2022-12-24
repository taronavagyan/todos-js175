const express = require("express");
const morgan = require("morgan");
const flash = require("express-flash");
const session = require("express-session");
const { body, validationResult } = require("express-validator");
const { sortTodoLists, sortTodos } = require("./lib/sort");
const TodoList = require("./lib/todolist");

const app = express();
const host = "localhost";
const port = 3000;

let todoLists = require("./lib/seed-data");

const loadTodoList = (todoListId) => {
  return todoLists.find((list) => list.id === todoListId);
};

const loadTodo = (todoListId, todoId) => {
  let todoList = loadTodoList(todoListId);
  if (!todoList) return undefined;

  return todoList.todos.find((todo) => todo.id === todoId);
};

app.set("views", "./views");
app.set("view engine", "pug");

app.use(morgan("common"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    name: "launch-school-todos-session-id",
    resave: false,
    saveUninitialized: true,
    secret: "this is not very secure",
  })
);

app.use(flash());

// Extract session info
app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

app.get("/", (req, res) => {
  res.redirect("/lists");
});

app.get("/lists", (req, res) => {
  res.render("lists", {
    todoLists: sortTodoLists(todoLists),
  });
});

app.get("/lists/new", (req, res) => {
  res.render("new-list");
});

app.get("/lists/:todoListId", (req, res, next) => {
  let todoListId = req.params.todoListId;
  let todoList = loadTodoList(+todoListId);
  if (todoList === undefined) {
    next(new Error("Not found."));
  } else {
    res.render("list", {
      todoList: todoList,
      todos: sortTodos(todoList),
    });
  }
});

app.post("/lists/:todoListId/todos/:todoId/toggle", (req, res, next) => {
  let { todoListId, todoId } = { ...req.params };
  let todo = loadTodo(+todoListId, +todoId);

  if (!todo) {
    next(new Error("Not found."));
  } else {
    let title = todo.title;
    if (todo.isDone()) {
      todo.markUndone();
      req.flash("success", `"${title}" marked as NOT done!`);
    } else {
      todo.markDone();
      req.flash("success", `"${title}" marked done.`);
    }
  }

  res.redirect(`/lists/${todoListId}`);
});

// Error handler
app.use((err, req, res, _next) => {
  console.log(err);
  res.status(404).send(err.message);
});

// Create a new todo list
app.post(
  "/lists",
  [
    body("todoListTitle")
      .trim()
      .isLength({ min: 1 })
      .withMessage("The list title is required.")
      .isLength({ max: 100 })
      .withMessage("List must be between 1 and 100 characters.")
      .custom((title) => {
        let duplicate = todoLists.find((list) => list.title === title);
        return duplicate === undefined;
      })
      .withMessage("List title must be unique."),
  ],
  (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("error", message.msg));
      res.render("new-list", {
        flash: req.flash(),
        todoListTitle: req.body.todoListTitle,
      });
    } else {
      todoLists.push(new TodoList(req.body.todoListTitle));
      req.flash("success", "The todo list has been created.");
      res.redirect("/lists");
    }
  }
);

// app.post("/lists/:todoListId/todos/:todoId/toggle", (req, res, next) => {
//   let { todoListId, todoId } = { ...req.params };
//   let todo = loadTodoList(+todoListId, +todoId);

//   if (!todo) {
//     next(new Error("Not found."));
//   } else {
//     let title = todo.title;
//     if (todo.isDone()) {
//       todo.markUndone();
//       req.flash("success", `"${title}" marked as NOT done!`);
//     } else {
//       todo.markDone();
//       req.flash("success", `"${title}" marked done!`);
//     }
//   }

//   res.redirect(`/lists/${todoListId}`);
// });

app.listen(port, host, () => {
  console.log(`Todos is listening on port ${port} of ${host}!`);
});
