import React, { useState, useEffect } from 'react';
import Authors from './components/Authors';
import Books from './components/Books';
import NewBook from './components/NewBook';
import LoginForm from './components/LoginForm';
import Recommend from './components/Recommend';
import { gql } from 'apollo-boost';
import { useQuery, useMutation, useApolloClient } from '@apollo/react-hooks';

const ALL_AUTHORS = gql`
  {
    allAuthors {
      name
      born
      bookCount
    }
  }
`;

const ALL_BOOKS = gql`
  {
    allBooks {
      title
      published
      author {
        name
      }
      genres
    }
  }
`;

const GET_USER = gql`
  {
    me {
      username
      favoriteGenre
    }
  }
`;

const ADD_BOOK = gql`
  mutation addBook(
    $title: String!
    $author: String!
    $published: Int!
    $genres: [String!]!
  ) {
    addBook(
      title: $title
      author: $author
      published: $published
      genres: $genres
    ) {
      title
      author {
        name
      }
      published
      genres
      id
    }
  }
`;

const EDIT_BIRTHYEAR = gql`
  mutation editBirthyear($name: String!, $setBornTo: Int!) {
    editAuthor(name: $name, setBornTo: $setBornTo) {
      name
      born
    }
  }
`;

const LOGIN = gql`
  mutation login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      value
    }
  }
`;

const App = () => {
  const [page, setPage] = useState('authors');
  const [token, setToken] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const client = useApolloClient();
  const [genre, setGenre] = useState('All');

  const handleError = error => {
    setErrorMessage(error.graphQLErrors[0].message);
    setTimeout(() => {
      setErrorMessage(null);
    }, 10000);
  };

  const user = useQuery(GET_USER);

  const authors = useQuery(ALL_AUTHORS);

  const books = useQuery(ALL_BOOKS);

  let visibleBooks = books.data.allBooks;

  if (genre !== 'All') {
    visibleBooks = visibleBooks.filter(vb => vb.genres.includes(genre));
  }

  const [login] = useMutation(LOGIN, {
    onError: handleError
  });

  const [addNewBook] = useMutation(ADD_BOOK, {
    refetchQueries: [{ query: ALL_AUTHORS }, { query: ALL_BOOKS }],
    update: (store, response) => {
      const dataInStore = store.readQuery({ query: ALL_BOOKS });
      dataInStore.allBooks.push(response.data.addBook);
      store.writeQuery({
        query: ALL_BOOKS,
        data: dataInStore
      });
    }
  });

  const [editBirthyear] = useMutation(EDIT_BIRTHYEAR, {
    refetchQueries: [{ query: ALL_AUTHORS }]
  });

  const errorNotification = () =>
    errorMessage && <div style={{ color: 'red' }}>{errorMessage}</div>;

  const logout = () => {
    setToken(null);
    localStorage.clear();
    client.resetStore();
  };

  if (!token) {
    return (
      <div>
        <h2>Login</h2>
        {errorNotification()}
        <LoginForm login={login} setToken={token => setToken(token)} />
      </div>
    );
  }

  let genres = ['All'];

  books.data.allBooks.map(b => {
    return b.genres.map(bookGenre =>
      genres.includes(bookGenre) ? null : genres.push(bookGenre)
    );
  });

  const selectGenre = e => {
    setGenre(e.target.innerText);
  };

  const recommendedBooksForUser = () => {
    console.log(user);
    console.log(
      books.data.allBooks.filter(b =>
        b.genres.includes(user.data.me.favoriteGenre)
      )
    );
    return books.data.allBooks.filter(b =>
      b.genres.includes(user.data.me.favoriteGenre)
    );
  };

  return (
    <div>
      <div>
        <button onClick={() => setPage('authors')}>authors</button>
        <button onClick={() => setPage('books')}>books</button>
        <button onClick={() => setPage('add')}>add book</button>
        <button onClick={() => setPage('recommend')}>recommend</button>
        <button onClick={logout}>logout</button>
      </div>
      <Authors
        show={page === 'authors'}
        authors={authors}
        setBirthYear={editBirthyear}
      />
      <Books show={page === 'books'} books={visibleBooks} />
      <NewBook show={page === 'add'} newBook={addNewBook} />
      <Recommend
        show={page === 'recommend'}
        recommendedBooks={recommendedBooksForUser()}
        favoriteGenre={user.data.me.favoriteGenre}
      />
      {genres.map((genre, i) => {
        return (
          <button key={i} onClick={selectGenre}>
            {genre}
          </button>
        );
      })}
    </div>
  );
};

export default App;
