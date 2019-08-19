const {
  ApolloServer,
  gql,
  UserInputError,
  AuthenticationError
} = require('apollo-server');
const uuid = require('uuid/v1');
const mongoose = require('mongoose');
const Person = require('./models/person');
const User = require('./models/user');
const jwt = require('jsonwebtoken');

mongoose.set('useFindAndModify', false);

const MONGODB_URI =
  'mongodb+srv://jerry:jerry@fullstackexample-upecv.mongodb.net/test?retryWrites=true&w=majority';

const JWT_SECRET = 'asdasdasdas';

console.log('connecting to', MONGODB_URI);

mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true })
  .then(() => {
    console.log('connected to MongoDB');
  })
  .catch(error => {
    console.log('error connection to MongoDB:', error.message);
  });

let persons = [
  {
    name: 'Arto Hellas',
    phone: '040-123543',
    street: 'Tapiolankatu 5 A',
    city: 'Espoo',
    id: '3d594650-3436-11e9-bc57-8b80ba54c431'
  },
  {
    name: 'Matti Luukkainen',
    phone: '040-432342',
    street: 'Malminkaari 10 A',
    city: 'Helsinki',
    id: '3d599470-3436-11e9-bc57-8b80ba54c431'
  },
  {
    name: 'Venla Ruuska',
    street: 'Nallemäentie 22 C',
    city: 'Helsinki',
    id: '3d599471-3436-11e9-bc57-8b80ba54c431'
  }
];

const typeDefs = gql`
  type Address {
    street: String!
    city: String!
  }
  type Person {
    name: String!
    phone: String
    address: Address!
    id: ID!
  }
  type User {
    username: String!
    friends: [Person!]!
    id: ID!
  }
  type Token {
    value: String!
  }
  type Query {
    personCount: Int!
    allPersons(phone: YesNo): [Person!]!
    findPerson(name: String!): Person
    me: User
  }
  type Mutation {
    addPerson(
      name: String!
      phone: String
      street: String!
      city: String!
    ): Person
    editNumber(name: String!, phone: String!): Person
    createUser(username: String!): User
    login(username: String!, password: String!): Token
    addAsFriend(name: String!): User
  }

  enum YesNo {
    YES
    NO
  }
`;

const resolvers = {
  Query: {
    personCount: () => persons.length,
    allPersons: (root, args) => {
      if (!args.phone) {
        return Person.find({});
      }
      return Person.find({ phone: { $exists: args.phone === 'YES' } });
    },
    findPerson: (root, args) => persons.find(p => p.name === args.name),
    me: (root, args, context) => {
      return context.currentUser;
    }
  },
  Person: {
    address: root => {
      return {
        street: root.street,
        city: root.city
      };
    }
  },
  Mutation: {
    addPerson: async (root, args, context) => {
      const person = new Person({ ...args });
      const currentUser = context.currentUser;

      if (!currentUser) {
        throw new AuthenticationError('not authenticated');
      }

      try {
        await person.save();
        currentUser.friends = currentUser.friends.concat(person);
        await currentUser.save();
      } catch (err) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        });
      }
      return person;
    },
    editNumber: (root, args) => {
      const person = persons.find(p => p.name === args.name);
      if (!person) {
        return null;
      }
      const updatedPerson = { ...person, phone: args.phone };
      persons = persons.map(p => (p.name === args.name ? updatedPerson : p));
      return updatedPerson;
    },
    createUser: (root, args) => {
      const user = new User({ username: args.username });

      return user.save().catch(error => {
        throw new UserInputError(error.message, {
          invalidArgs: args
        });
      });
    },
    //Stupid login in the course material
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });

      if (!user || args.password !== 'secred') {
        throw new UserInputError('Wrong credentials');
      }
      const userForToken = {
        username: user.username,
        id: user._id
      };
      return { value: jwt.sign(userForToken, JWT_SECRET) };
    },
    addAsFriend: async (root, args, { currentUser }) => {
      const nonFirendAlready = person => {
        !currentUser.friends.map(f => f._id).includes(person_id);
      };

      if (!currentUser) {
        throw new AuthenticationError('not authenticated');
      }

      const person = await Person.findOne({ name: args.name });
      if (nonFirendAlready(person)) {
        currentUser.friends = currentUser.friends.concat(person);
      }
      await currentUser.save();

      return currentUser;
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

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
