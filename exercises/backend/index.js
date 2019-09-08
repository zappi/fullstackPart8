const {
  ApolloServer,
  gql,
  UserInputError,
  AuthenticationError
} = require('apollo-server');
const { PubSub } = require('apollo-server');

const mongoose = require('mongoose');
const Author = require('./models/author');
const Book = require('./models/book');
const User = require('./models/user');
const jwt = require('jsonwebtoken');

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
const pubsub = new PubSub();
const typeDefs = gql`
  type Book {
    title: String!
    published: Int!
    author: Author!
    genres: [String!]!
    id: ID!
  }
  type Author {
    name: String!
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

  type Subscription {
    bookAdded: Book!
  }
`;

const resolvers = {
  Query: {
    authorCount: async () => await Author.find({}).length,

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
      console.log('lol');
      return await Author.find({}).populate('book');
    },
    me: async (root, args, context) => {
      console.log(context);
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
      pubsub.publish('BOOK_ADDED', { bookAdded: book });
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
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator(['BOOK_ADDED'])
    }
  }
};
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null;
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET);
      const currentUser = await User.findById(decodedToken.id).populate(
        'friends'
      );
      return { currentUser };
    }
  }
});

server.listen().then(({ url, subscriptionsUrl }) => {
  console.log(`Server ready at ${url}`);
  console.log(`Subscriptions ready at ${subscriptionsUrl}`);
});
