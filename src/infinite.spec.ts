import { expect, test } from '@jest/globals';
import { Stream, Arr } from './orientation';

test('infinite stream', () => {
  expect(
    Stream.nats()
      .dropWhile(x => x < 100)
      .takeWhile(x => x < 1000)
      .fmap(id => ({ username: `username${id}`, password: id % 5 === 0 || id % 3 === 0 ? `${id}` : null }))
      .filter(user => user.password !== null)
      .find(user => user.username.startsWith('username5'))
      .toArr(),
  ).toEqual(Arr.of({ password: '500', username: 'username500' }));
});
