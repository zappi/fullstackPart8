const {
  ApolloServer,
  gql,
  UserInputError,
  AuthenticationError
} = require('apollo-server');

const mongoose = require('mongoose');
const Author = require('./models/author');
const Book = require('./models/book');
const User = require('./models/user');

mongoose.set('useFindAndModify', false);

//These are here just for the course, in real world they should be in environment variable file
const MONGODB_URI =
  'mongodb+srv://jerry:jerry@fullstackexample-upecv.mongodb.net/test?retryWrites=true&w=majority';
const JWT_SECRET = 'asdasdasdas';

mongoose
  .set('useCreateIndex', true)
  .connect(MONGODB_URI, { useNewUrlParser: true })
  .then(() => {
    console.log('connected to MongoDB');
  })
  .catch(error => {
    console.log('error connection to MongoDB:', error.message);
  });

const typeDefs = gql`
  type Book {
    title: String!
    published: Int!
    author: Author!
    genres: [String!]!
    id: ID!
  }
  type Author {
    name: String
    id: ID!
    born: Int
    bookCount: Int
  }
  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book]
    allAuthors: [Author]
    me: User
  }
  type Mutation {
    addBook(
      title: String!
      author: String!
      published: Int!
      genres: [String!]!
    ): Book
    editAuthor(name: String!, setBornTo: Int!): Author
    createUser(username: String!, favoriteGenre: String!): User
    login(username: String!, password: String!): Token
  }
`;

const resolvers = {
  Query: {
    bookCount: async () => await Book.find({}).length,
    authorCount: async () => await Author.find({}).length,

    //kato toi
    allBooks: async (root, args) => {
      console.log(args);
      if (!args.author && !args.genre) {
        const foundBooks = await Book.find({}).populate('author');
        return foundBooks;
      }
      let returnedBooks = await Book.find({}).populate('author');
      if (args.genre) {
        returnedBooks = returnedBooks.filter(
          b => b.genres.indexOf(args.genre) > -1
        );
      }
      if (args.author) {
        returnedBooks = returnedBooks.filter(b => b.author == args.author);
      }
      return returnedBooks;
    },
    allAuthors: async () => {
      return await Author.find({});
    },
    me: (root, args, context) => {
      return context.currentUser;
    }
  },
  Mutation: {
    addBook: async (root, args, context) => {
      const currentUser = context.currentUser;

      if (!currentUser) {
        throw new AuthenticationError('not authenticated');
      }
      let foundAuthor = await Author.findOne({
        name: args.author
      });

      if (!foundAuthor) {
        foundAuthor = new Author({ name: args.author });
      }
      const book = new Book({ ...args, author: foundAuthor });

      try {
        await book.save();
        await foundAuthor.save();
      } catch (err) {
        throw new UserInputError(err.message, {
          invalidArgs: 'Virheellistä tekstiä'
        });
      }

      return book;
    },
    editAuthor: async (root, args, context) => {
      const currentUser = context.currentUser;

      if (!currentUser) {
        throw new AuthenticationError('not authenticated');
      }
      try {
        const author = await Author.findOne({ name: args.name });

        author.born = args.setBornTo;

        await author.save();
      } catch (err) {
        throw new UserInputError(error, {
          msg: args
        });
      }
      return author;
    },
    createUser: (root, args) => {
      const user = new User({
        username: args.username,
        favoriteGenre: args.favoriteGenre
      });
      return user.save().catch(error => {
        throw new UserInputError(error.message, {
          invalidArgs: args
        });
      });
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });

      if (!user || args.password !== 'secred') {
        throw new UserInputError('wrong credentials');
      }

      const userForToken = {
        username: user.username,
        id: user._id
      };

      return { value: jwt.sign(userForToken, JWT_SECRET) };
    }
  },
  Book: {
    author: async root => {
      const foundAuthor = await Author.findOne({ name: root.author.name });
      return foundAuthor;
    }
  },
  Author: {
    bookCount: async (root, args) => {
      const booksArr = await Book.find({ author: root.id });
      return booksArr.length;
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
