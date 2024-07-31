export class Maybe<A> {
  private constructor(public readonly maybe: <B>(b: B, f: (_: A) => B) => B) {}
  static nothing<A>(): Maybe<A> {
    return new Maybe((x, _) => x);
  }
  public static just<A>(x: A): Maybe<A> {
    return new Maybe((_, f) => f(x));
  }
  public static mapMaybes<A, B>(f: (_: A) => Maybe<B>, xs: Arr<A>): Arr<B> {
    return Arr.fromArray(
      xs.foldl(
        (ys, x) =>
          f(x).maybe(ys, y => {
            ys.push(y);
            return ys;
          }),
        [] as B[],
      ),
    );
  }
  public static catMaybes<A>(xs: Arr<Maybe<A>>): Arr<A> {
    return this.mapMaybes(x => x, xs);
  }
  public static fromNullable<A>(x: A): Maybe<NonNullable<A>> {
    return x === null || x === undefined ? Maybe.nothing() : Maybe.just(x);
  }
  public orElse(a: A): A {
    return this.maybe(a, x => x);
  }
  public pick<K extends keyof A>(k: K): Maybe<NonNullable<A[K]>> {
    return this.maybe(Maybe.nothing(), x => Maybe.fromNullable(x[k]));
  }
  public fmap<B>(f: (_: A) => B): Maybe<B> {
    return this.maybe(Maybe.nothing(), x => Maybe.just(f(x)));
  }
  public fmap_<B>(f: (_: A) => B | undefined | null): Maybe<B> {
    return this.maybe(Maybe.nothing(), x => Maybe.fromNullable(f(x)));
  }
  public apply<B>(f: Maybe<(_: A) => B>): Maybe<B> {
    return this.maybe(Maybe.nothing(), x => f.fmap(g => g(x)));
  }
  public flatMap<B>(f: (_: A) => Maybe<B>): Maybe<B> {
    return this.maybe(Maybe.nothing(), x => f(x));
  }
  public toEither<L>(l: L): Either<L, A> {
    return this.maybe(Either.left(l), x => Either.right(x));
  }
  public toArr() {
    return this.maybe(Arr.empty(), Arr.of);
  }
  public toString() {
    return this.maybe(`Nothing()`, x => `Just(${JSON.stringify(x)})`);
  }
}

export class Either<L, A> {
  private constructor(public readonly either: <B>(f: (_: L) => B, g: (_: A) => B) => B) {}
  static left<L, A>(l: L): Either<L, A> {
    return new Either((f, _) => f(l));
  }
  static right<L, A>(x: A): Either<L, A> {
    return new Either((_, f) => f(x));
  }
  public fmap<B>(f: (_: A) => B): Either<L, B> {
    return this.either(
      l => Either.left(l),
      x => Either.right(f(x)),
    );
  }
  public bimap<M, B>(f: (_: L) => M, g: (_: A) => B): Either<M, B> {
    return this.either(
      l => Either.left(f(l)),
      x => Either.right(g(x)),
    );
  }
  public apply<B>(f: Either<L, (_: A) => B>): Either<L, B> {
    return this.either(
      l => Either.left(l),
      x => f.fmap(g => g(x)),
    );
  }
  public flatMap<B>(f: (_: A) => Either<L, B>): Either<L, B> {
    return this.either(
      l => Either.left(l),
      x => f(x),
    );
  }
  public toMaybe(): Maybe<A> {
    return this.either(
      _ => Maybe.nothing(),
      x => Maybe.just(x),
    );
  }
  public toString() {
    return this.either(
      l => `Left(${JSON.stringify(l)})`,
      r => `Right(${JSON.stringify(r)})`,
    );
  }
}

// I aint gonna do trampolining + continuation passing style to get real lazyness here...
// Oh... IRL generators are problematic though :(
// aaandd ooommmggg it is terrible :D :D mah gawd generators are ugly :D :D :D
type G<A> = Generator<A, void, unknown>;

const iterate = <A>(f: (_: A) => A, a: A) =>
  function* () {
    yield a;
    while (true) {
      a = f(a);
      yield a;
    }
  };

const cycle = <A>(xs: A[]) =>
  function* () {
    while (true) {
      for (const x of xs) {
        yield x;
      }
    }
  };

function* nats() {
  let x = 0;
  while (true) {
    yield x++;
  }
}

const fmap = <A, B>(f: (_: A) => B, g: () => G<A>) =>
  function* () {
    for (const x of g()) {
      yield f(x);
    }
  };

const filter = <A>(p: (_: A) => boolean, g: () => G<A>) =>
  function* () {
    for (const x of g()) {
      if (p(x)) {
        yield x;
      }
    }
  };

const take = <A>(n: number, g: () => G<A>) =>
  function* () {
    for (const x of g()) {
      if (--n <= 0) break;
      yield x;
    }
  };

const takeWhile = <A>(p: (_: A) => boolean, g: () => G<A>) =>
  function* () {
    for (const x of g()) {
      if (p(x)) {
        yield x;
      } else {
        break;
      }
    }
  };

const drop = <A>(n: number, g: () => G<A>) =>
  function* () {
    for (const x of g()) {
      if (--n < 0) yield x;
    }
  };

const dropWhile = <A>(p: (_: A) => boolean, g: () => G<A>) =>
  function* () {
    let yielding = false;
    for (const x of g()) {
      if (yielding) {
        yield x;
      } else if (!p(x)) {
        yielding = true;
      }
    }
  };

export class Stream<A> {
  private constructor(private readonly gen: () => G<A>) {}
  public static iterate<A>(f: (_: A) => A, a: A): Stream<A> {
    return new Stream(iterate(f, a));
  }
  public static cycle<A>(xs: A[]): Stream<A> {
    return new Stream(cycle(xs));
  }
  public static nats(): Stream<number> {
    return new Stream(nats);
  }
  public fmap<B>(f: (_: A) => B): Stream<B> {
    return new Stream(fmap(f, this.gen));
  }
  public filter(p: (_: A) => boolean): Stream<A> {
    return new Stream(filter(p, this.gen));
  }
  public take(n: number): Stream<A> {
    return new Stream(take(n, this.gen));
  }
  public takeWhile(p: (_: A) => boolean): Stream<A> {
    return new Stream(takeWhile(p, this.gen));
  }
  public drop(n: number): Stream<A> {
    return new Stream(drop(n, this.gen));
  }
  public dropWhile(p: (_: A) => boolean): Stream<A> {
    return new Stream(dropWhile(p, this.gen));
  }
  public find(p: (_: A) => boolean): Maybe<A> {
    for (const x of this.gen()) {
      if (p(x)) {
        return Maybe.just(x);
      }
    }
    return Maybe.nothing();
  }
  public foldl<B>(plus: (_: B, __: A) => B, y: B): B {
    for (const x of this.gen()) {
      y = plus(y, x);
    }
    return y;
  }
  public toArr(): Arr<A> {
    return Arr.fromArray(
      this.foldl((xs, x) => {
        xs.push(x);
        return xs;
      }, [] as A[]),
    );
  }
  public toString() {
    return `Stream()`;
  }
}

export class Arr<A> {
  private constructor(private readonly xs: ReadonlyArray<A>) {}
  public static empty<A>(): Arr<A> {
    return new Arr<A>([]);
  }
  public static of<A>(x: A): Arr<A> {
    return new Arr<A>([x]);
  }
  public static fromArray<A>(xs: A[]): Arr<A> {
    return new Arr<A>(xs);
  }
  public static replicate<A>(n: number, a: A): Arr<A> {
    return new Arr<A>(Array(n).fill(a));
  }
  public fmap<B>(f: (_: A) => B): Arr<B> {
    return Arr.fromArray(this.xs.map(f));
  }
  public apply<B>(fs: Arr<(_: A) => B>): Arr<B> {
    return this.flatMap(x => fs.fmap(f => f(x)));
  }
  public flatMap<B>(f: (_: A) => Arr<B>): Arr<B> {
    return Arr.fromArray(this.xs.flatMap(arr => f(arr).xs));
  }
  public filter(p: (_: A) => boolean): Arr<A> {
    return Arr.fromArray(this.xs.filter(p));
  }
  public find(p: (_: A) => boolean): Maybe<A> {
    return Maybe.fromNullable(this.xs.find(p));
  }
  public head(): Maybe<A> {
    const [x, ..._] = this.xs;
    return Maybe.fromNullable(x);
  }
  public tail(): Arr<A> {
    const [_, ...xs] = this.xs;
    return Arr.fromArray(xs);
  }
  public uncons(): Maybe<[A, Arr<A>]> {
    const [x, ...xs] = this.xs;
    return Maybe.fromNullable(x).fmap(head => [head, Arr.fromArray(xs)]);
  }
  public foldl<B>(plus: (_: B, __: A) => B, zero: B): B {
    return this.xs.reduce(plus, zero);
  }
  public toString() {
    return `Arr(${this.xs.join(', ')})`;
  }
}
