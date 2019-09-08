import { useQuery } from '@apollo/react-hooks';
import { gql } from 'apollo-boost';
import React, { useEffect, useState } from 'react';

const USER = gql`
  {
    me {
      username
      favoriteGenre
    }
  }
`;

const RECOMMENDED_BOOKS = gql`
  query findBooksByGenre($genre: String!) {
    allBooks(genre: $genre) {
      title
      author {
        name
      }
      genres
      published
    }
  }
`;

const Recommend = props => {
  const [recommendations, setRecommendations] = useState([]);
  const user = useQuery(USER);

  let genre = '';
  if (user.data.me) {
    genre = user.data.me.favoriteGenre;
  }

  let getRecommendations = async () => {
    const recommendations = await props.client.query({
      query: RECOMMENDED_BOOKS,
      variables: { genre: genre }
    });

    setRecommendations(recommendations.data.allBooks);
  };

  useEffect(() => {
    getRecommendations();
  });

  if (!props.show || recommendations.length === 0) {
    return null;
  }

  return (
    <div>
      <p>
        Books in your favorite genre <b>{user.data.me.favoriteGenre}</b>
      </p>
      {recommendations.map((book, i) => {
        return <div key={i}>{book.title}</div>;
      })}
    </div>
  );
};

export default Recommend;
