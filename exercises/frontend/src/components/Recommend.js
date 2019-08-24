import React from 'react';

const Recommend = props => {
  const { favoriteGenre, recommendedBooks } = props;

  if (!props.show) {
    return null;
  }
  return (
    <div>
      <p>
        Books in your favorite genre <b>{favoriteGenre}</b>
      </p>
      {recommendedBooks.map((book, i) => {
        return <div key={i}>{book.title}</div>;
      })}
    </div>
  );
};

export default Recommend;
