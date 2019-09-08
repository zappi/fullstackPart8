import React, { useState } from 'react';
import { gql } from 'apollo-boost';
import { useQuery } from '@apollo/react-hooks';

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

const Books = props => {
  let books = useQuery(ALL_BOOKS);

  const [genre, setGenre] = useState('');

  if (!props.show) {
    return null;
  }
  if (books.loading) {
    return null;
  } else {
    let genres = ['All'];
    let visibleBooks = books.data.allBooks;

    if (genre !== 'All') {
      visibleBooks = visibleBooks.filter(vb => vb.genres.includes(genre));
    }

    books.data.allBooks.map(b => {
      return b.genres.map(bookGenre =>
        genres.includes(bookGenre) ? null : genres.push(bookGenre)
      );
    });

    const selectGenre = e => {
      setGenre(e.target.innerText);
    };
    return (
      <div>
        <h2>books</h2>

        <table>
          <tbody>
            <tr>
              <th />
              <th>author</th>
              <th>published</th>
            </tr>
            {visibleBooks.map(a => (
              <tr key={a.title}>
                <td>{a.title}</td>
                <td>{a.author.name}</td>
                <td>{a.published}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {genres.map((genre, i) => {
          return (
            <button key={i} onClick={selectGenre}>
              {genre}
            </button>
          );
        })}
      </div>
    );
  }
};

export default Books;
