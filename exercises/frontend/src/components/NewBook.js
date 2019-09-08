import React, { useState } from 'react';
import { gql } from 'apollo-boost';
import { useMutation, useSubscription } from '@apollo/react-hooks';

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

const BOOK_ADDED = gql`
  subscription {
    bookAdded {
      id
      title
      author {
        name
      }
      published
      genres
    }
  }
`;

const NewBook = props => {
  const [title, setTitle] = useState('');
  const [author, setAuhtor] = useState('');
  const [published, setPublished] = useState('');
  const [genre, setGenre] = useState('');
  const [genres, setGenres] = useState([]);

  const [addNewBook] = useMutation(ADD_BOOK, {
    refetchQueries: [{ query: ALL_AUTHORS }, { query: ALL_BOOKS }],
    update: (store, response) => {
      const dataInStore = store.readQuery({ query: ALL_BOOKS });
      dataInStore.allBooks.push(response.data.addBook);
      store.writeQuery({
        query: ALL_BOOKS,
        data: dataInStore,
        update: (store, res) => {
          updateCacheWith(res.data.addBook);
        }
      });
    }
  });

  const updateCacheWith = addedBook => {
    const includedIn = (set, object) => set.map(p => p.id).includes(object.id);

    const dataInStore = props.client.readQuery({ query: ALL_BOOKS });
    console.log(dataInStore);
    console.log(addedBook);
    console.log(!includedIn(dataInStore.allBooks, addedBook));
    if (!includedIn(dataInStore.allBooks, addedBook)) {
      dataInStore.allBooks.push(addedBook);
      props.client.writeQuery({
        query: ALL_BOOKS,
        data: dataInStore
      });
    }
  };

  useSubscription(BOOK_ADDED, {
    onSubscriptionData: ({ subscriptionData }) => {
      console.log('WEBSOCKET');
      const addedBook = subscriptionData.data.bookAdded;
      props.notify(`${addedBook.name} added`);
      updateCacheWith(addedBook);
    }
  });

  if (!props.show) {
    return null;
  }

  const submit = async e => {
    e.preventDefault();

    const publishedAsInt = Number(published);

    await addNewBook({
      variables: { title, published: publishedAsInt, author, genres }
    });

    setTitle('');
    setPublished('');
    setAuhtor('');
    setGenres([]);
    setGenre('');
  };

  const addGenre = () => {
    setGenres(genres.concat(genre));
    setGenre('');
  };

  return (
    <div>
      <form onSubmit={submit}>
        <div>
          title
          <input
            value={title}
            onChange={({ target }) => setTitle(target.value)}
          />
        </div>
        <div>
          author
          <input
            value={author}
            onChange={({ target }) => setAuhtor(target.value)}
          />
        </div>
        <div>
          published
          <input
            type="number"
            value={published}
            onChange={({ target }) => setPublished(target.value)}
          />
        </div>
        <div>
          <input
            value={genre}
            onChange={({ target }) => setGenre(target.value)}
          />
          <button onClick={addGenre} type="button">
            add genre
          </button>
        </div>
        <div>genres: {genres.join(' ')}</div>
        <button type="submit">create book</button>
      </form>
    </div>
  );
};

export default NewBook;
