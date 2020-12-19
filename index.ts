interface IEnumerable<T> {
   select<R>(mapper: (item: T) => R): IEnumerable<R>;
   where(predicate: (item: T) => boolean): IEnumerable<T>;
   groupBy<K>(mapper: (item: T) => K): IEnumerable<IGroup<K, IEnumerable<T>>>;

   take(count: number): IEnumerable<T>;
   skip(count: number): IEnumerable<T>;

   sum(): number;
   min(): number;
   max(): number;

   forEach(action: (item: T) => void): void;
   toArray(): T[];
   toSet(): Set<T>;
}

interface IGroup<K, V> {
   key: K;
   values: V
}

class Stream<T> implements IEnumerable<T> {
   constructor(private readonly gen: Generator<T, void, unknown>) { }

   public static of<T>(source: T[]): IEnumerable<T> {
      function* generatorFromArray(source: T[]): Generator<T, void, unknown> {
         for (const item of source) {
            yield item;
         }
      }

      return new Stream(generatorFromArray(source));
   }

   public select<R>(mapper: (item: T) => R): IEnumerable<R> {
      function* newGen(currentGen: Generator<T, void, unknown>) {
         for (const item of currentGen) {
            yield mapper(item);
         }
      }

      return new Stream(newGen(this.gen));
   }

   public where(predicate: (item: T) => boolean): IEnumerable<T> {
      function* newGen(currentGen: Generator<T, void, unknown>) {
         for (const item of currentGen) {
            if (!predicate(item)) continue;

            yield item;
         }
      }

      return new Stream(newGen(this.gen));
   }

   public groupBy<K>(mapper: (item: T) => K): IEnumerable<IGroup<K, IEnumerable<T>>> {
      function* newGen(currentGen: Generator<T, void, unknown>) {
         const groups = new Map<K, T[]>();

         for (const item of currentGen) {
            const key = mapper(item);

            if (!groups.has(key)) {
               groups.set(key, [item]);
               continue;
            }

            const exisitng = groups.get(key);
            exisitng.push(item);

            groups.set(key, exisitng);
         }

         for (const [key, values] of groups) {
            yield {
               key,
               values: Stream.of(values)
            }
         }
      }

      return new Stream(newGen(this.gen));
   }

   public take(count: number): IEnumerable<T> {
      const newGen = function* (currentGen: Generator<T, void, unknown>) {
         let counter = 0;

         for (const item of currentGen) {
            if (counter == count) break;
            counter++;

            yield item;
         }
      }

      return new Stream(newGen(this.gen));
   }

   public skip(count: number): IEnumerable<T> {
      const newGen = function* (currentGen: Generator<T, void, unknown>) {
         let counter = 0;

         for (const item of currentGen) {
            if (counter < count) {
               counter++;
               continue;
            }

            yield item;
         }
      }

      return new Stream(newGen(this.gen));
   }

   public sum(): number {
      let result = 0;

      for (const item of this.gen) {
         result += this.parseToNumber(item);
      }

      return result;
   }

   public min(): number {
      let min: number | null = null;

      for (const item of this.gen) {
         if (min === null) {
            min = this.parseToNumber(item);
            continue;
         }

         min = Math.min(min, this.parseToNumber(item));
      }

      return min as number;
   }

   public max(): number {
      let max: number | null = null;

      for (const item of this.gen) {
         if (max === null) {
            max = this.parseToNumber(item);
            continue;
         }

         max = Math.max(max, this.parseToNumber(item));
      }

      return max as number;
   }

   public forEach(action: (item: T) => void): void {
      for (const item of this.gen) {
         action(item);
      }
   }

   public toArray() {
      return Array.from(this.gen);
   }

   public toSet() {
      return new Set(this.gen);
   }

   private parseToNumber(item: T): number {
      if (typeof item !== 'number') {
         throw new Error('All items of the stream must be numbers');
      }

      return item;
   }
}

function stream<T>(source: T[]): IEnumerable<T> {
   return Stream.of(source);
}

function range(start: number, end: number): IEnumerable<number> {

   if (start > end) {
      throw new Error('Start number can not be greater than end number');
   }

   if (end < start) {
      throw new Error('End number can not be less than start number');
   }

   const rangeGen = function* () {
      for (let i = start; i <= end; i++) {
         yield i;
      }
   }

   return new Stream(rangeGen());
}


stream([1, 2, 2, 2, 3, 4, 4]).groupBy(n => n).forEach(console.log);

