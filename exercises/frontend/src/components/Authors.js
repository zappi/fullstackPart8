import React, { useState } from 'react';
import { gql } from 'apollo-boost';
import { useQuery, useMutation } from '@apollo/react-hooks';

const EDIT_BIRTHYEAR = gql`
  mutation editBirthyear($name: String!, $setBornTo: Int!) {
    editAuthor(name: $name, setBornTo: $setBornTo) {
      name
      born
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

const Authors = props => {
  const [name, setName] = useState();
  const [born, setBorn] = useState('');

  const [editBirthyear] = useMutation(EDIT_BIRTHYEAR, {
    refetchQueries: [{ query: ALL_AUTHORS }]
  });

  let authors = useQuery(ALL_AUTHORS);

  const handleAuthorChange = e => {
    setName(e.target.value);
  };

  const setBirthyear = async e => {
    e.preventDefault();
    const bornAsInt = Number(born);

    await editBirthyear({
      variables: { name: name, setBornTo: bornAsInt }
    });

    setName('');
    setBorn('');
  };

  if (!props.show) {
    return null;
  }

  if (!authors.loading) {
    const visibleAuthors = authors.data.allAuthors;

    return (
      <div>
        <h2>authors</h2>
        <table>
          <tbody>
            <tr>
              <th />
              <th>born</th>
              <th>books</th>
            </tr>
            {visibleAuthors.map(a => (
              <tr key={a.name}>
                <td>{a.name}</td>
                <td>{a.born}</td>
                <td>{a.bookCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>Set birthyear</h2>
        <form onSubmit={setBirthyear}>
          <div>
            name
            <select value={name} onChange={handleAuthorChange}>
              {visibleAuthors.map(a => {
                return <option key={a.name}>{a.name}</option>;
              })}
            </select>
          </div>
          <div>
            born
            <input
              value={born}
              onChange={({ target }) => setBorn(target.value)}
            />
          </div>
          <div>
            <button type="submit">update author</button>
          </div>
        </form>
      </div>
    );
  }
  return null;
};

export default Authors;
