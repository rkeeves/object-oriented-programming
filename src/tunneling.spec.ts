import { expect, test } from '@jest/globals';
import { Arr, Maybe } from './orientation';

type Tunnel = {
  a?: {
    term?: string;
    b?: {
      term?: string;
      c?: {
        term?: string;
        d?: {
          e?: {
            f?: {
              term?: string;
            } | null;
          } | null;
        } | null;
        dd?: {
          term?: string;
        } | null;
      } | null;
    } | null;
  } | null;
};

const TUNNELS_WITH_CANDY: Tunnel[] = [
  {
    a: {
      b: {
        c: {
          d: {
            e: {
              f: {
                term: 'Candy',
              },
            },
          },
          dd: {
            term: 'This Candy should not be found...',
          },
        },
      },
    },
  },
  {
    a: { term: 'Candy' },
  },
  {
    a: {
      b: {
        c: {
          d: {
            e: {},
          },
          dd: { term: 'Candy' },
        },
      },
    },
  },
];

const TUNNELS_WITHOUT_CANDY: (Tunnel | null)[] = [
  null,
  {
    a: {
      b: {
        c: {
          d: null,
        },
      },
    },
  },
  {},
  {
    a: {
      b: {},
    },
  },
];

TUNNELS_WITH_CANDY.forEach((o, i) => {
  test(`candies can be found ${i}`, () => {
    const hits = Maybe.catMaybes(
      Arr.fromArray([
        Maybe.fromNullable(o).pick('a').pick('b').pick('c').pick('d').pick('e').pick('f').pick('term'),
        Maybe.fromNullable(o).pick('a').pick('b').pick('c').pick('dd').pick('term'),
        Maybe.fromNullable(o).pick('a').pick('term'),
      ]),
    );
    expect(hits.head().orElse('No Candy found')).toEqual('Candy');
  });
});

TUNNELS_WITHOUT_CANDY.forEach((o, i) => {
  test(`nulls and missing props are getting abstracted over ${i}`, () => {
    const hits = Maybe.catMaybes(
      Arr.fromArray([
        Maybe.fromNullable(o).pick('a').pick('b').pick('c').pick('d').pick('e').pick('f').pick('term'),
        Maybe.fromNullable(o).pick('a').pick('b').pick('c').pick('dd').pick('term'),
        Maybe.fromNullable(o).pick('a').pick('term'),
      ]),
    );
    expect(hits.head().orElse('No Candy found')).toEqual('No Candy found');
  });
});

test('annoying language perk #2423423', () => {
  expect(`${Maybe.fromNullable({ user: 'asd' })}`).toEqual('Just({"user":"asd"})');
});
