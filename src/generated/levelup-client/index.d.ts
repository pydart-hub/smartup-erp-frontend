
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model LevelUpSubject
 * 
 */
export type LevelUpSubject = $Result.DefaultSelection<Prisma.$LevelUpSubjectPayload>
/**
 * Model LevelUpQuestion
 * 
 */
export type LevelUpQuestion = $Result.DefaultSelection<Prisma.$LevelUpQuestionPayload>
/**
 * Model LevelUpQuestionOption
 * 
 */
export type LevelUpQuestionOption = $Result.DefaultSelection<Prisma.$LevelUpQuestionOptionPayload>
/**
 * Model LevelUpPaper
 * 
 */
export type LevelUpPaper = $Result.DefaultSelection<Prisma.$LevelUpPaperPayload>
/**
 * Model LevelUpPaperQuestion
 * 
 */
export type LevelUpPaperQuestion = $Result.DefaultSelection<Prisma.$LevelUpPaperQuestionPayload>
/**
 * Model LevelUpPublishing
 * 
 */
export type LevelUpPublishing = $Result.DefaultSelection<Prisma.$LevelUpPublishingPayload>
/**
 * Model LevelUpRegistration
 * 
 */
export type LevelUpRegistration = $Result.DefaultSelection<Prisma.$LevelUpRegistrationPayload>
/**
 * Model LevelUpAttempt
 * 
 */
export type LevelUpAttempt = $Result.DefaultSelection<Prisma.$LevelUpAttemptPayload>
/**
 * Model LevelUpAttemptAnswer
 * 
 */
export type LevelUpAttemptAnswer = $Result.DefaultSelection<Prisma.$LevelUpAttemptAnswerPayload>

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more LevelUpSubjects
 * const levelUpSubjects = await prisma.levelUpSubject.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more LevelUpSubjects
   * const levelUpSubjects = await prisma.levelUpSubject.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.levelUpSubject`: Exposes CRUD operations for the **LevelUpSubject** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more LevelUpSubjects
    * const levelUpSubjects = await prisma.levelUpSubject.findMany()
    * ```
    */
  get levelUpSubject(): Prisma.LevelUpSubjectDelegate<ExtArgs>;

  /**
   * `prisma.levelUpQuestion`: Exposes CRUD operations for the **LevelUpQuestion** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more LevelUpQuestions
    * const levelUpQuestions = await prisma.levelUpQuestion.findMany()
    * ```
    */
  get levelUpQuestion(): Prisma.LevelUpQuestionDelegate<ExtArgs>;

  /**
   * `prisma.levelUpQuestionOption`: Exposes CRUD operations for the **LevelUpQuestionOption** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more LevelUpQuestionOptions
    * const levelUpQuestionOptions = await prisma.levelUpQuestionOption.findMany()
    * ```
    */
  get levelUpQuestionOption(): Prisma.LevelUpQuestionOptionDelegate<ExtArgs>;

  /**
   * `prisma.levelUpPaper`: Exposes CRUD operations for the **LevelUpPaper** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more LevelUpPapers
    * const levelUpPapers = await prisma.levelUpPaper.findMany()
    * ```
    */
  get levelUpPaper(): Prisma.LevelUpPaperDelegate<ExtArgs>;

  /**
   * `prisma.levelUpPaperQuestion`: Exposes CRUD operations for the **LevelUpPaperQuestion** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more LevelUpPaperQuestions
    * const levelUpPaperQuestions = await prisma.levelUpPaperQuestion.findMany()
    * ```
    */
  get levelUpPaperQuestion(): Prisma.LevelUpPaperQuestionDelegate<ExtArgs>;

  /**
   * `prisma.levelUpPublishing`: Exposes CRUD operations for the **LevelUpPublishing** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more LevelUpPublishings
    * const levelUpPublishings = await prisma.levelUpPublishing.findMany()
    * ```
    */
  get levelUpPublishing(): Prisma.LevelUpPublishingDelegate<ExtArgs>;

  /**
   * `prisma.levelUpRegistration`: Exposes CRUD operations for the **LevelUpRegistration** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more LevelUpRegistrations
    * const levelUpRegistrations = await prisma.levelUpRegistration.findMany()
    * ```
    */
  get levelUpRegistration(): Prisma.LevelUpRegistrationDelegate<ExtArgs>;

  /**
   * `prisma.levelUpAttempt`: Exposes CRUD operations for the **LevelUpAttempt** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more LevelUpAttempts
    * const levelUpAttempts = await prisma.levelUpAttempt.findMany()
    * ```
    */
  get levelUpAttempt(): Prisma.LevelUpAttemptDelegate<ExtArgs>;

  /**
   * `prisma.levelUpAttemptAnswer`: Exposes CRUD operations for the **LevelUpAttemptAnswer** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more LevelUpAttemptAnswers
    * const levelUpAttemptAnswers = await prisma.levelUpAttemptAnswer.findMany()
    * ```
    */
  get levelUpAttemptAnswer(): Prisma.LevelUpAttemptAnswerDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.22.0
   * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    LevelUpSubject: 'LevelUpSubject',
    LevelUpQuestion: 'LevelUpQuestion',
    LevelUpQuestionOption: 'LevelUpQuestionOption',
    LevelUpPaper: 'LevelUpPaper',
    LevelUpPaperQuestion: 'LevelUpPaperQuestion',
    LevelUpPublishing: 'LevelUpPublishing',
    LevelUpRegistration: 'LevelUpRegistration',
    LevelUpAttempt: 'LevelUpAttempt',
    LevelUpAttemptAnswer: 'LevelUpAttemptAnswer'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs, clientOptions: PrismaClientOptions }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> = {
    meta: {
      modelProps: "levelUpSubject" | "levelUpQuestion" | "levelUpQuestionOption" | "levelUpPaper" | "levelUpPaperQuestion" | "levelUpPublishing" | "levelUpRegistration" | "levelUpAttempt" | "levelUpAttemptAnswer"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      LevelUpSubject: {
        payload: Prisma.$LevelUpSubjectPayload<ExtArgs>
        fields: Prisma.LevelUpSubjectFieldRefs
        operations: {
          findUnique: {
            args: Prisma.LevelUpSubjectFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpSubjectPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.LevelUpSubjectFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpSubjectPayload>
          }
          findFirst: {
            args: Prisma.LevelUpSubjectFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpSubjectPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.LevelUpSubjectFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpSubjectPayload>
          }
          findMany: {
            args: Prisma.LevelUpSubjectFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpSubjectPayload>[]
          }
          create: {
            args: Prisma.LevelUpSubjectCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpSubjectPayload>
          }
          createMany: {
            args: Prisma.LevelUpSubjectCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.LevelUpSubjectCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpSubjectPayload>[]
          }
          delete: {
            args: Prisma.LevelUpSubjectDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpSubjectPayload>
          }
          update: {
            args: Prisma.LevelUpSubjectUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpSubjectPayload>
          }
          deleteMany: {
            args: Prisma.LevelUpSubjectDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.LevelUpSubjectUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.LevelUpSubjectUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpSubjectPayload>
          }
          aggregate: {
            args: Prisma.LevelUpSubjectAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLevelUpSubject>
          }
          groupBy: {
            args: Prisma.LevelUpSubjectGroupByArgs<ExtArgs>
            result: $Utils.Optional<LevelUpSubjectGroupByOutputType>[]
          }
          count: {
            args: Prisma.LevelUpSubjectCountArgs<ExtArgs>
            result: $Utils.Optional<LevelUpSubjectCountAggregateOutputType> | number
          }
        }
      }
      LevelUpQuestion: {
        payload: Prisma.$LevelUpQuestionPayload<ExtArgs>
        fields: Prisma.LevelUpQuestionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.LevelUpQuestionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.LevelUpQuestionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionPayload>
          }
          findFirst: {
            args: Prisma.LevelUpQuestionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.LevelUpQuestionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionPayload>
          }
          findMany: {
            args: Prisma.LevelUpQuestionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionPayload>[]
          }
          create: {
            args: Prisma.LevelUpQuestionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionPayload>
          }
          createMany: {
            args: Prisma.LevelUpQuestionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.LevelUpQuestionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionPayload>[]
          }
          delete: {
            args: Prisma.LevelUpQuestionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionPayload>
          }
          update: {
            args: Prisma.LevelUpQuestionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionPayload>
          }
          deleteMany: {
            args: Prisma.LevelUpQuestionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.LevelUpQuestionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.LevelUpQuestionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionPayload>
          }
          aggregate: {
            args: Prisma.LevelUpQuestionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLevelUpQuestion>
          }
          groupBy: {
            args: Prisma.LevelUpQuestionGroupByArgs<ExtArgs>
            result: $Utils.Optional<LevelUpQuestionGroupByOutputType>[]
          }
          count: {
            args: Prisma.LevelUpQuestionCountArgs<ExtArgs>
            result: $Utils.Optional<LevelUpQuestionCountAggregateOutputType> | number
          }
        }
      }
      LevelUpQuestionOption: {
        payload: Prisma.$LevelUpQuestionOptionPayload<ExtArgs>
        fields: Prisma.LevelUpQuestionOptionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.LevelUpQuestionOptionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionOptionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.LevelUpQuestionOptionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionOptionPayload>
          }
          findFirst: {
            args: Prisma.LevelUpQuestionOptionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionOptionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.LevelUpQuestionOptionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionOptionPayload>
          }
          findMany: {
            args: Prisma.LevelUpQuestionOptionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionOptionPayload>[]
          }
          create: {
            args: Prisma.LevelUpQuestionOptionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionOptionPayload>
          }
          createMany: {
            args: Prisma.LevelUpQuestionOptionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.LevelUpQuestionOptionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionOptionPayload>[]
          }
          delete: {
            args: Prisma.LevelUpQuestionOptionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionOptionPayload>
          }
          update: {
            args: Prisma.LevelUpQuestionOptionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionOptionPayload>
          }
          deleteMany: {
            args: Prisma.LevelUpQuestionOptionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.LevelUpQuestionOptionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.LevelUpQuestionOptionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpQuestionOptionPayload>
          }
          aggregate: {
            args: Prisma.LevelUpQuestionOptionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLevelUpQuestionOption>
          }
          groupBy: {
            args: Prisma.LevelUpQuestionOptionGroupByArgs<ExtArgs>
            result: $Utils.Optional<LevelUpQuestionOptionGroupByOutputType>[]
          }
          count: {
            args: Prisma.LevelUpQuestionOptionCountArgs<ExtArgs>
            result: $Utils.Optional<LevelUpQuestionOptionCountAggregateOutputType> | number
          }
        }
      }
      LevelUpPaper: {
        payload: Prisma.$LevelUpPaperPayload<ExtArgs>
        fields: Prisma.LevelUpPaperFieldRefs
        operations: {
          findUnique: {
            args: Prisma.LevelUpPaperFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.LevelUpPaperFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperPayload>
          }
          findFirst: {
            args: Prisma.LevelUpPaperFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.LevelUpPaperFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperPayload>
          }
          findMany: {
            args: Prisma.LevelUpPaperFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperPayload>[]
          }
          create: {
            args: Prisma.LevelUpPaperCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperPayload>
          }
          createMany: {
            args: Prisma.LevelUpPaperCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.LevelUpPaperCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperPayload>[]
          }
          delete: {
            args: Prisma.LevelUpPaperDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperPayload>
          }
          update: {
            args: Prisma.LevelUpPaperUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperPayload>
          }
          deleteMany: {
            args: Prisma.LevelUpPaperDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.LevelUpPaperUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.LevelUpPaperUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperPayload>
          }
          aggregate: {
            args: Prisma.LevelUpPaperAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLevelUpPaper>
          }
          groupBy: {
            args: Prisma.LevelUpPaperGroupByArgs<ExtArgs>
            result: $Utils.Optional<LevelUpPaperGroupByOutputType>[]
          }
          count: {
            args: Prisma.LevelUpPaperCountArgs<ExtArgs>
            result: $Utils.Optional<LevelUpPaperCountAggregateOutputType> | number
          }
        }
      }
      LevelUpPaperQuestion: {
        payload: Prisma.$LevelUpPaperQuestionPayload<ExtArgs>
        fields: Prisma.LevelUpPaperQuestionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.LevelUpPaperQuestionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperQuestionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.LevelUpPaperQuestionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperQuestionPayload>
          }
          findFirst: {
            args: Prisma.LevelUpPaperQuestionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperQuestionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.LevelUpPaperQuestionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperQuestionPayload>
          }
          findMany: {
            args: Prisma.LevelUpPaperQuestionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperQuestionPayload>[]
          }
          create: {
            args: Prisma.LevelUpPaperQuestionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperQuestionPayload>
          }
          createMany: {
            args: Prisma.LevelUpPaperQuestionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.LevelUpPaperQuestionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperQuestionPayload>[]
          }
          delete: {
            args: Prisma.LevelUpPaperQuestionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperQuestionPayload>
          }
          update: {
            args: Prisma.LevelUpPaperQuestionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperQuestionPayload>
          }
          deleteMany: {
            args: Prisma.LevelUpPaperQuestionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.LevelUpPaperQuestionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.LevelUpPaperQuestionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPaperQuestionPayload>
          }
          aggregate: {
            args: Prisma.LevelUpPaperQuestionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLevelUpPaperQuestion>
          }
          groupBy: {
            args: Prisma.LevelUpPaperQuestionGroupByArgs<ExtArgs>
            result: $Utils.Optional<LevelUpPaperQuestionGroupByOutputType>[]
          }
          count: {
            args: Prisma.LevelUpPaperQuestionCountArgs<ExtArgs>
            result: $Utils.Optional<LevelUpPaperQuestionCountAggregateOutputType> | number
          }
        }
      }
      LevelUpPublishing: {
        payload: Prisma.$LevelUpPublishingPayload<ExtArgs>
        fields: Prisma.LevelUpPublishingFieldRefs
        operations: {
          findUnique: {
            args: Prisma.LevelUpPublishingFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPublishingPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.LevelUpPublishingFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPublishingPayload>
          }
          findFirst: {
            args: Prisma.LevelUpPublishingFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPublishingPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.LevelUpPublishingFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPublishingPayload>
          }
          findMany: {
            args: Prisma.LevelUpPublishingFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPublishingPayload>[]
          }
          create: {
            args: Prisma.LevelUpPublishingCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPublishingPayload>
          }
          createMany: {
            args: Prisma.LevelUpPublishingCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.LevelUpPublishingCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPublishingPayload>[]
          }
          delete: {
            args: Prisma.LevelUpPublishingDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPublishingPayload>
          }
          update: {
            args: Prisma.LevelUpPublishingUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPublishingPayload>
          }
          deleteMany: {
            args: Prisma.LevelUpPublishingDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.LevelUpPublishingUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.LevelUpPublishingUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpPublishingPayload>
          }
          aggregate: {
            args: Prisma.LevelUpPublishingAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLevelUpPublishing>
          }
          groupBy: {
            args: Prisma.LevelUpPublishingGroupByArgs<ExtArgs>
            result: $Utils.Optional<LevelUpPublishingGroupByOutputType>[]
          }
          count: {
            args: Prisma.LevelUpPublishingCountArgs<ExtArgs>
            result: $Utils.Optional<LevelUpPublishingCountAggregateOutputType> | number
          }
        }
      }
      LevelUpRegistration: {
        payload: Prisma.$LevelUpRegistrationPayload<ExtArgs>
        fields: Prisma.LevelUpRegistrationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.LevelUpRegistrationFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpRegistrationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.LevelUpRegistrationFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpRegistrationPayload>
          }
          findFirst: {
            args: Prisma.LevelUpRegistrationFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpRegistrationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.LevelUpRegistrationFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpRegistrationPayload>
          }
          findMany: {
            args: Prisma.LevelUpRegistrationFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpRegistrationPayload>[]
          }
          create: {
            args: Prisma.LevelUpRegistrationCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpRegistrationPayload>
          }
          createMany: {
            args: Prisma.LevelUpRegistrationCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.LevelUpRegistrationCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpRegistrationPayload>[]
          }
          delete: {
            args: Prisma.LevelUpRegistrationDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpRegistrationPayload>
          }
          update: {
            args: Prisma.LevelUpRegistrationUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpRegistrationPayload>
          }
          deleteMany: {
            args: Prisma.LevelUpRegistrationDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.LevelUpRegistrationUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.LevelUpRegistrationUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpRegistrationPayload>
          }
          aggregate: {
            args: Prisma.LevelUpRegistrationAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLevelUpRegistration>
          }
          groupBy: {
            args: Prisma.LevelUpRegistrationGroupByArgs<ExtArgs>
            result: $Utils.Optional<LevelUpRegistrationGroupByOutputType>[]
          }
          count: {
            args: Prisma.LevelUpRegistrationCountArgs<ExtArgs>
            result: $Utils.Optional<LevelUpRegistrationCountAggregateOutputType> | number
          }
        }
      }
      LevelUpAttempt: {
        payload: Prisma.$LevelUpAttemptPayload<ExtArgs>
        fields: Prisma.LevelUpAttemptFieldRefs
        operations: {
          findUnique: {
            args: Prisma.LevelUpAttemptFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.LevelUpAttemptFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptPayload>
          }
          findFirst: {
            args: Prisma.LevelUpAttemptFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.LevelUpAttemptFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptPayload>
          }
          findMany: {
            args: Prisma.LevelUpAttemptFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptPayload>[]
          }
          create: {
            args: Prisma.LevelUpAttemptCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptPayload>
          }
          createMany: {
            args: Prisma.LevelUpAttemptCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.LevelUpAttemptCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptPayload>[]
          }
          delete: {
            args: Prisma.LevelUpAttemptDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptPayload>
          }
          update: {
            args: Prisma.LevelUpAttemptUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptPayload>
          }
          deleteMany: {
            args: Prisma.LevelUpAttemptDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.LevelUpAttemptUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.LevelUpAttemptUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptPayload>
          }
          aggregate: {
            args: Prisma.LevelUpAttemptAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLevelUpAttempt>
          }
          groupBy: {
            args: Prisma.LevelUpAttemptGroupByArgs<ExtArgs>
            result: $Utils.Optional<LevelUpAttemptGroupByOutputType>[]
          }
          count: {
            args: Prisma.LevelUpAttemptCountArgs<ExtArgs>
            result: $Utils.Optional<LevelUpAttemptCountAggregateOutputType> | number
          }
        }
      }
      LevelUpAttemptAnswer: {
        payload: Prisma.$LevelUpAttemptAnswerPayload<ExtArgs>
        fields: Prisma.LevelUpAttemptAnswerFieldRefs
        operations: {
          findUnique: {
            args: Prisma.LevelUpAttemptAnswerFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptAnswerPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.LevelUpAttemptAnswerFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptAnswerPayload>
          }
          findFirst: {
            args: Prisma.LevelUpAttemptAnswerFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptAnswerPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.LevelUpAttemptAnswerFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptAnswerPayload>
          }
          findMany: {
            args: Prisma.LevelUpAttemptAnswerFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptAnswerPayload>[]
          }
          create: {
            args: Prisma.LevelUpAttemptAnswerCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptAnswerPayload>
          }
          createMany: {
            args: Prisma.LevelUpAttemptAnswerCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.LevelUpAttemptAnswerCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptAnswerPayload>[]
          }
          delete: {
            args: Prisma.LevelUpAttemptAnswerDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptAnswerPayload>
          }
          update: {
            args: Prisma.LevelUpAttemptAnswerUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptAnswerPayload>
          }
          deleteMany: {
            args: Prisma.LevelUpAttemptAnswerDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.LevelUpAttemptAnswerUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.LevelUpAttemptAnswerUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LevelUpAttemptAnswerPayload>
          }
          aggregate: {
            args: Prisma.LevelUpAttemptAnswerAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLevelUpAttemptAnswer>
          }
          groupBy: {
            args: Prisma.LevelUpAttemptAnswerGroupByArgs<ExtArgs>
            result: $Utils.Optional<LevelUpAttemptAnswerGroupByOutputType>[]
          }
          count: {
            args: Prisma.LevelUpAttemptAnswerCountArgs<ExtArgs>
            result: $Utils.Optional<LevelUpAttemptAnswerCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }


  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type LevelUpSubjectCountOutputType
   */

  export type LevelUpSubjectCountOutputType = {
    questions: number
    papers: number
    publishings: number
  }

  export type LevelUpSubjectCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    questions?: boolean | LevelUpSubjectCountOutputTypeCountQuestionsArgs
    papers?: boolean | LevelUpSubjectCountOutputTypeCountPapersArgs
    publishings?: boolean | LevelUpSubjectCountOutputTypeCountPublishingsArgs
  }

  // Custom InputTypes
  /**
   * LevelUpSubjectCountOutputType without action
   */
  export type LevelUpSubjectCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpSubjectCountOutputType
     */
    select?: LevelUpSubjectCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * LevelUpSubjectCountOutputType without action
   */
  export type LevelUpSubjectCountOutputTypeCountQuestionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LevelUpQuestionWhereInput
  }

  /**
   * LevelUpSubjectCountOutputType without action
   */
  export type LevelUpSubjectCountOutputTypeCountPapersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LevelUpPaperWhereInput
  }

  /**
   * LevelUpSubjectCountOutputType without action
   */
  export type LevelUpSubjectCountOutputTypeCountPublishingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LevelUpPublishingWhereInput
  }


  /**
   * Count Type LevelUpQuestionCountOutputType
   */

  export type LevelUpQuestionCountOutputType = {
    options: number
    paperLinks: number
  }

  export type LevelUpQuestionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    options?: boolean | LevelUpQuestionCountOutputTypeCountOptionsArgs
    paperLinks?: boolean | LevelUpQuestionCountOutputTypeCountPaperLinksArgs
  }

  // Custom InputTypes
  /**
   * LevelUpQuestionCountOutputType without action
   */
  export type LevelUpQuestionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestionCountOutputType
     */
    select?: LevelUpQuestionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * LevelUpQuestionCountOutputType without action
   */
  export type LevelUpQuestionCountOutputTypeCountOptionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LevelUpQuestionOptionWhereInput
  }

  /**
   * LevelUpQuestionCountOutputType without action
   */
  export type LevelUpQuestionCountOutputTypeCountPaperLinksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LevelUpPaperQuestionWhereInput
  }


  /**
   * Count Type LevelUpPaperCountOutputType
   */

  export type LevelUpPaperCountOutputType = {
    questions: number
    publishings: number
  }

  export type LevelUpPaperCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    questions?: boolean | LevelUpPaperCountOutputTypeCountQuestionsArgs
    publishings?: boolean | LevelUpPaperCountOutputTypeCountPublishingsArgs
  }

  // Custom InputTypes
  /**
   * LevelUpPaperCountOutputType without action
   */
  export type LevelUpPaperCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaperCountOutputType
     */
    select?: LevelUpPaperCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * LevelUpPaperCountOutputType without action
   */
  export type LevelUpPaperCountOutputTypeCountQuestionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LevelUpPaperQuestionWhereInput
  }

  /**
   * LevelUpPaperCountOutputType without action
   */
  export type LevelUpPaperCountOutputTypeCountPublishingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LevelUpPublishingWhereInput
  }


  /**
   * Count Type LevelUpPublishingCountOutputType
   */

  export type LevelUpPublishingCountOutputType = {
    attempts: number
  }

  export type LevelUpPublishingCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    attempts?: boolean | LevelUpPublishingCountOutputTypeCountAttemptsArgs
  }

  // Custom InputTypes
  /**
   * LevelUpPublishingCountOutputType without action
   */
  export type LevelUpPublishingCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPublishingCountOutputType
     */
    select?: LevelUpPublishingCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * LevelUpPublishingCountOutputType without action
   */
  export type LevelUpPublishingCountOutputTypeCountAttemptsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LevelUpAttemptWhereInput
  }


  /**
   * Count Type LevelUpAttemptCountOutputType
   */

  export type LevelUpAttemptCountOutputType = {
    answers: number
  }

  export type LevelUpAttemptCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    answers?: boolean | LevelUpAttemptCountOutputTypeCountAnswersArgs
  }

  // Custom InputTypes
  /**
   * LevelUpAttemptCountOutputType without action
   */
  export type LevelUpAttemptCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttemptCountOutputType
     */
    select?: LevelUpAttemptCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * LevelUpAttemptCountOutputType without action
   */
  export type LevelUpAttemptCountOutputTypeCountAnswersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LevelUpAttemptAnswerWhereInput
  }


  /**
   * Models
   */

  /**
   * Model LevelUpSubject
   */

  export type AggregateLevelUpSubject = {
    _count: LevelUpSubjectCountAggregateOutputType | null
    _min: LevelUpSubjectMinAggregateOutputType | null
    _max: LevelUpSubjectMaxAggregateOutputType | null
  }

  export type LevelUpSubjectMinAggregateOutputType = {
    code: string | null
    name: string | null
    createdAt: Date | null
  }

  export type LevelUpSubjectMaxAggregateOutputType = {
    code: string | null
    name: string | null
    createdAt: Date | null
  }

  export type LevelUpSubjectCountAggregateOutputType = {
    code: number
    name: number
    createdAt: number
    _all: number
  }


  export type LevelUpSubjectMinAggregateInputType = {
    code?: true
    name?: true
    createdAt?: true
  }

  export type LevelUpSubjectMaxAggregateInputType = {
    code?: true
    name?: true
    createdAt?: true
  }

  export type LevelUpSubjectCountAggregateInputType = {
    code?: true
    name?: true
    createdAt?: true
    _all?: true
  }

  export type LevelUpSubjectAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LevelUpSubject to aggregate.
     */
    where?: LevelUpSubjectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpSubjects to fetch.
     */
    orderBy?: LevelUpSubjectOrderByWithRelationInput | LevelUpSubjectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: LevelUpSubjectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpSubjects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpSubjects.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned LevelUpSubjects
    **/
    _count?: true | LevelUpSubjectCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: LevelUpSubjectMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: LevelUpSubjectMaxAggregateInputType
  }

  export type GetLevelUpSubjectAggregateType<T extends LevelUpSubjectAggregateArgs> = {
        [P in keyof T & keyof AggregateLevelUpSubject]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLevelUpSubject[P]>
      : GetScalarType<T[P], AggregateLevelUpSubject[P]>
  }




  export type LevelUpSubjectGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LevelUpSubjectWhereInput
    orderBy?: LevelUpSubjectOrderByWithAggregationInput | LevelUpSubjectOrderByWithAggregationInput[]
    by: LevelUpSubjectScalarFieldEnum[] | LevelUpSubjectScalarFieldEnum
    having?: LevelUpSubjectScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: LevelUpSubjectCountAggregateInputType | true
    _min?: LevelUpSubjectMinAggregateInputType
    _max?: LevelUpSubjectMaxAggregateInputType
  }

  export type LevelUpSubjectGroupByOutputType = {
    code: string
    name: string
    createdAt: Date
    _count: LevelUpSubjectCountAggregateOutputType | null
    _min: LevelUpSubjectMinAggregateOutputType | null
    _max: LevelUpSubjectMaxAggregateOutputType | null
  }

  type GetLevelUpSubjectGroupByPayload<T extends LevelUpSubjectGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<LevelUpSubjectGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof LevelUpSubjectGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], LevelUpSubjectGroupByOutputType[P]>
            : GetScalarType<T[P], LevelUpSubjectGroupByOutputType[P]>
        }
      >
    >


  export type LevelUpSubjectSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    code?: boolean
    name?: boolean
    createdAt?: boolean
    questions?: boolean | LevelUpSubject$questionsArgs<ExtArgs>
    papers?: boolean | LevelUpSubject$papersArgs<ExtArgs>
    publishings?: boolean | LevelUpSubject$publishingsArgs<ExtArgs>
    _count?: boolean | LevelUpSubjectCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["levelUpSubject"]>

  export type LevelUpSubjectSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    code?: boolean
    name?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["levelUpSubject"]>

  export type LevelUpSubjectSelectScalar = {
    code?: boolean
    name?: boolean
    createdAt?: boolean
  }

  export type LevelUpSubjectInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    questions?: boolean | LevelUpSubject$questionsArgs<ExtArgs>
    papers?: boolean | LevelUpSubject$papersArgs<ExtArgs>
    publishings?: boolean | LevelUpSubject$publishingsArgs<ExtArgs>
    _count?: boolean | LevelUpSubjectCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type LevelUpSubjectIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $LevelUpSubjectPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "LevelUpSubject"
    objects: {
      questions: Prisma.$LevelUpQuestionPayload<ExtArgs>[]
      papers: Prisma.$LevelUpPaperPayload<ExtArgs>[]
      publishings: Prisma.$LevelUpPublishingPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      code: string
      name: string
      createdAt: Date
    }, ExtArgs["result"]["levelUpSubject"]>
    composites: {}
  }

  type LevelUpSubjectGetPayload<S extends boolean | null | undefined | LevelUpSubjectDefaultArgs> = $Result.GetResult<Prisma.$LevelUpSubjectPayload, S>

  type LevelUpSubjectCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<LevelUpSubjectFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: LevelUpSubjectCountAggregateInputType | true
    }

  export interface LevelUpSubjectDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['LevelUpSubject'], meta: { name: 'LevelUpSubject' } }
    /**
     * Find zero or one LevelUpSubject that matches the filter.
     * @param {LevelUpSubjectFindUniqueArgs} args - Arguments to find a LevelUpSubject
     * @example
     * // Get one LevelUpSubject
     * const levelUpSubject = await prisma.levelUpSubject.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends LevelUpSubjectFindUniqueArgs>(args: SelectSubset<T, LevelUpSubjectFindUniqueArgs<ExtArgs>>): Prisma__LevelUpSubjectClient<$Result.GetResult<Prisma.$LevelUpSubjectPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one LevelUpSubject that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {LevelUpSubjectFindUniqueOrThrowArgs} args - Arguments to find a LevelUpSubject
     * @example
     * // Get one LevelUpSubject
     * const levelUpSubject = await prisma.levelUpSubject.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends LevelUpSubjectFindUniqueOrThrowArgs>(args: SelectSubset<T, LevelUpSubjectFindUniqueOrThrowArgs<ExtArgs>>): Prisma__LevelUpSubjectClient<$Result.GetResult<Prisma.$LevelUpSubjectPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first LevelUpSubject that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpSubjectFindFirstArgs} args - Arguments to find a LevelUpSubject
     * @example
     * // Get one LevelUpSubject
     * const levelUpSubject = await prisma.levelUpSubject.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends LevelUpSubjectFindFirstArgs>(args?: SelectSubset<T, LevelUpSubjectFindFirstArgs<ExtArgs>>): Prisma__LevelUpSubjectClient<$Result.GetResult<Prisma.$LevelUpSubjectPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first LevelUpSubject that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpSubjectFindFirstOrThrowArgs} args - Arguments to find a LevelUpSubject
     * @example
     * // Get one LevelUpSubject
     * const levelUpSubject = await prisma.levelUpSubject.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends LevelUpSubjectFindFirstOrThrowArgs>(args?: SelectSubset<T, LevelUpSubjectFindFirstOrThrowArgs<ExtArgs>>): Prisma__LevelUpSubjectClient<$Result.GetResult<Prisma.$LevelUpSubjectPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more LevelUpSubjects that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpSubjectFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all LevelUpSubjects
     * const levelUpSubjects = await prisma.levelUpSubject.findMany()
     * 
     * // Get first 10 LevelUpSubjects
     * const levelUpSubjects = await prisma.levelUpSubject.findMany({ take: 10 })
     * 
     * // Only select the `code`
     * const levelUpSubjectWithCodeOnly = await prisma.levelUpSubject.findMany({ select: { code: true } })
     * 
     */
    findMany<T extends LevelUpSubjectFindManyArgs>(args?: SelectSubset<T, LevelUpSubjectFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpSubjectPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a LevelUpSubject.
     * @param {LevelUpSubjectCreateArgs} args - Arguments to create a LevelUpSubject.
     * @example
     * // Create one LevelUpSubject
     * const LevelUpSubject = await prisma.levelUpSubject.create({
     *   data: {
     *     // ... data to create a LevelUpSubject
     *   }
     * })
     * 
     */
    create<T extends LevelUpSubjectCreateArgs>(args: SelectSubset<T, LevelUpSubjectCreateArgs<ExtArgs>>): Prisma__LevelUpSubjectClient<$Result.GetResult<Prisma.$LevelUpSubjectPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many LevelUpSubjects.
     * @param {LevelUpSubjectCreateManyArgs} args - Arguments to create many LevelUpSubjects.
     * @example
     * // Create many LevelUpSubjects
     * const levelUpSubject = await prisma.levelUpSubject.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends LevelUpSubjectCreateManyArgs>(args?: SelectSubset<T, LevelUpSubjectCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many LevelUpSubjects and returns the data saved in the database.
     * @param {LevelUpSubjectCreateManyAndReturnArgs} args - Arguments to create many LevelUpSubjects.
     * @example
     * // Create many LevelUpSubjects
     * const levelUpSubject = await prisma.levelUpSubject.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many LevelUpSubjects and only return the `code`
     * const levelUpSubjectWithCodeOnly = await prisma.levelUpSubject.createManyAndReturn({ 
     *   select: { code: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends LevelUpSubjectCreateManyAndReturnArgs>(args?: SelectSubset<T, LevelUpSubjectCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpSubjectPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a LevelUpSubject.
     * @param {LevelUpSubjectDeleteArgs} args - Arguments to delete one LevelUpSubject.
     * @example
     * // Delete one LevelUpSubject
     * const LevelUpSubject = await prisma.levelUpSubject.delete({
     *   where: {
     *     // ... filter to delete one LevelUpSubject
     *   }
     * })
     * 
     */
    delete<T extends LevelUpSubjectDeleteArgs>(args: SelectSubset<T, LevelUpSubjectDeleteArgs<ExtArgs>>): Prisma__LevelUpSubjectClient<$Result.GetResult<Prisma.$LevelUpSubjectPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one LevelUpSubject.
     * @param {LevelUpSubjectUpdateArgs} args - Arguments to update one LevelUpSubject.
     * @example
     * // Update one LevelUpSubject
     * const levelUpSubject = await prisma.levelUpSubject.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends LevelUpSubjectUpdateArgs>(args: SelectSubset<T, LevelUpSubjectUpdateArgs<ExtArgs>>): Prisma__LevelUpSubjectClient<$Result.GetResult<Prisma.$LevelUpSubjectPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more LevelUpSubjects.
     * @param {LevelUpSubjectDeleteManyArgs} args - Arguments to filter LevelUpSubjects to delete.
     * @example
     * // Delete a few LevelUpSubjects
     * const { count } = await prisma.levelUpSubject.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends LevelUpSubjectDeleteManyArgs>(args?: SelectSubset<T, LevelUpSubjectDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more LevelUpSubjects.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpSubjectUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many LevelUpSubjects
     * const levelUpSubject = await prisma.levelUpSubject.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends LevelUpSubjectUpdateManyArgs>(args: SelectSubset<T, LevelUpSubjectUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one LevelUpSubject.
     * @param {LevelUpSubjectUpsertArgs} args - Arguments to update or create a LevelUpSubject.
     * @example
     * // Update or create a LevelUpSubject
     * const levelUpSubject = await prisma.levelUpSubject.upsert({
     *   create: {
     *     // ... data to create a LevelUpSubject
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the LevelUpSubject we want to update
     *   }
     * })
     */
    upsert<T extends LevelUpSubjectUpsertArgs>(args: SelectSubset<T, LevelUpSubjectUpsertArgs<ExtArgs>>): Prisma__LevelUpSubjectClient<$Result.GetResult<Prisma.$LevelUpSubjectPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of LevelUpSubjects.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpSubjectCountArgs} args - Arguments to filter LevelUpSubjects to count.
     * @example
     * // Count the number of LevelUpSubjects
     * const count = await prisma.levelUpSubject.count({
     *   where: {
     *     // ... the filter for the LevelUpSubjects we want to count
     *   }
     * })
    **/
    count<T extends LevelUpSubjectCountArgs>(
      args?: Subset<T, LevelUpSubjectCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], LevelUpSubjectCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a LevelUpSubject.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpSubjectAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends LevelUpSubjectAggregateArgs>(args: Subset<T, LevelUpSubjectAggregateArgs>): Prisma.PrismaPromise<GetLevelUpSubjectAggregateType<T>>

    /**
     * Group by LevelUpSubject.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpSubjectGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends LevelUpSubjectGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: LevelUpSubjectGroupByArgs['orderBy'] }
        : { orderBy?: LevelUpSubjectGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, LevelUpSubjectGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLevelUpSubjectGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the LevelUpSubject model
   */
  readonly fields: LevelUpSubjectFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for LevelUpSubject.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__LevelUpSubjectClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    questions<T extends LevelUpSubject$questionsArgs<ExtArgs> = {}>(args?: Subset<T, LevelUpSubject$questionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpQuestionPayload<ExtArgs>, T, "findMany"> | Null>
    papers<T extends LevelUpSubject$papersArgs<ExtArgs> = {}>(args?: Subset<T, LevelUpSubject$papersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpPaperPayload<ExtArgs>, T, "findMany"> | Null>
    publishings<T extends LevelUpSubject$publishingsArgs<ExtArgs> = {}>(args?: Subset<T, LevelUpSubject$publishingsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpPublishingPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the LevelUpSubject model
   */ 
  interface LevelUpSubjectFieldRefs {
    readonly code: FieldRef<"LevelUpSubject", 'String'>
    readonly name: FieldRef<"LevelUpSubject", 'String'>
    readonly createdAt: FieldRef<"LevelUpSubject", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * LevelUpSubject findUnique
   */
  export type LevelUpSubjectFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpSubject
     */
    select?: LevelUpSubjectSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpSubjectInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpSubject to fetch.
     */
    where: LevelUpSubjectWhereUniqueInput
  }

  /**
   * LevelUpSubject findUniqueOrThrow
   */
  export type LevelUpSubjectFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpSubject
     */
    select?: LevelUpSubjectSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpSubjectInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpSubject to fetch.
     */
    where: LevelUpSubjectWhereUniqueInput
  }

  /**
   * LevelUpSubject findFirst
   */
  export type LevelUpSubjectFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpSubject
     */
    select?: LevelUpSubjectSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpSubjectInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpSubject to fetch.
     */
    where?: LevelUpSubjectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpSubjects to fetch.
     */
    orderBy?: LevelUpSubjectOrderByWithRelationInput | LevelUpSubjectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LevelUpSubjects.
     */
    cursor?: LevelUpSubjectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpSubjects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpSubjects.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LevelUpSubjects.
     */
    distinct?: LevelUpSubjectScalarFieldEnum | LevelUpSubjectScalarFieldEnum[]
  }

  /**
   * LevelUpSubject findFirstOrThrow
   */
  export type LevelUpSubjectFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpSubject
     */
    select?: LevelUpSubjectSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpSubjectInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpSubject to fetch.
     */
    where?: LevelUpSubjectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpSubjects to fetch.
     */
    orderBy?: LevelUpSubjectOrderByWithRelationInput | LevelUpSubjectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LevelUpSubjects.
     */
    cursor?: LevelUpSubjectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpSubjects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpSubjects.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LevelUpSubjects.
     */
    distinct?: LevelUpSubjectScalarFieldEnum | LevelUpSubjectScalarFieldEnum[]
  }

  /**
   * LevelUpSubject findMany
   */
  export type LevelUpSubjectFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpSubject
     */
    select?: LevelUpSubjectSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpSubjectInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpSubjects to fetch.
     */
    where?: LevelUpSubjectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpSubjects to fetch.
     */
    orderBy?: LevelUpSubjectOrderByWithRelationInput | LevelUpSubjectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing LevelUpSubjects.
     */
    cursor?: LevelUpSubjectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpSubjects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpSubjects.
     */
    skip?: number
    distinct?: LevelUpSubjectScalarFieldEnum | LevelUpSubjectScalarFieldEnum[]
  }

  /**
   * LevelUpSubject create
   */
  export type LevelUpSubjectCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpSubject
     */
    select?: LevelUpSubjectSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpSubjectInclude<ExtArgs> | null
    /**
     * The data needed to create a LevelUpSubject.
     */
    data: XOR<LevelUpSubjectCreateInput, LevelUpSubjectUncheckedCreateInput>
  }

  /**
   * LevelUpSubject createMany
   */
  export type LevelUpSubjectCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many LevelUpSubjects.
     */
    data: LevelUpSubjectCreateManyInput | LevelUpSubjectCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * LevelUpSubject createManyAndReturn
   */
  export type LevelUpSubjectCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpSubject
     */
    select?: LevelUpSubjectSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many LevelUpSubjects.
     */
    data: LevelUpSubjectCreateManyInput | LevelUpSubjectCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * LevelUpSubject update
   */
  export type LevelUpSubjectUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpSubject
     */
    select?: LevelUpSubjectSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpSubjectInclude<ExtArgs> | null
    /**
     * The data needed to update a LevelUpSubject.
     */
    data: XOR<LevelUpSubjectUpdateInput, LevelUpSubjectUncheckedUpdateInput>
    /**
     * Choose, which LevelUpSubject to update.
     */
    where: LevelUpSubjectWhereUniqueInput
  }

  /**
   * LevelUpSubject updateMany
   */
  export type LevelUpSubjectUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update LevelUpSubjects.
     */
    data: XOR<LevelUpSubjectUpdateManyMutationInput, LevelUpSubjectUncheckedUpdateManyInput>
    /**
     * Filter which LevelUpSubjects to update
     */
    where?: LevelUpSubjectWhereInput
  }

  /**
   * LevelUpSubject upsert
   */
  export type LevelUpSubjectUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpSubject
     */
    select?: LevelUpSubjectSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpSubjectInclude<ExtArgs> | null
    /**
     * The filter to search for the LevelUpSubject to update in case it exists.
     */
    where: LevelUpSubjectWhereUniqueInput
    /**
     * In case the LevelUpSubject found by the `where` argument doesn't exist, create a new LevelUpSubject with this data.
     */
    create: XOR<LevelUpSubjectCreateInput, LevelUpSubjectUncheckedCreateInput>
    /**
     * In case the LevelUpSubject was found with the provided `where` argument, update it with this data.
     */
    update: XOR<LevelUpSubjectUpdateInput, LevelUpSubjectUncheckedUpdateInput>
  }

  /**
   * LevelUpSubject delete
   */
  export type LevelUpSubjectDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpSubject
     */
    select?: LevelUpSubjectSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpSubjectInclude<ExtArgs> | null
    /**
     * Filter which LevelUpSubject to delete.
     */
    where: LevelUpSubjectWhereUniqueInput
  }

  /**
   * LevelUpSubject deleteMany
   */
  export type LevelUpSubjectDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LevelUpSubjects to delete
     */
    where?: LevelUpSubjectWhereInput
  }

  /**
   * LevelUpSubject.questions
   */
  export type LevelUpSubject$questionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestion
     */
    select?: LevelUpQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionInclude<ExtArgs> | null
    where?: LevelUpQuestionWhereInput
    orderBy?: LevelUpQuestionOrderByWithRelationInput | LevelUpQuestionOrderByWithRelationInput[]
    cursor?: LevelUpQuestionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LevelUpQuestionScalarFieldEnum | LevelUpQuestionScalarFieldEnum[]
  }

  /**
   * LevelUpSubject.papers
   */
  export type LevelUpSubject$papersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaper
     */
    select?: LevelUpPaperSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperInclude<ExtArgs> | null
    where?: LevelUpPaperWhereInput
    orderBy?: LevelUpPaperOrderByWithRelationInput | LevelUpPaperOrderByWithRelationInput[]
    cursor?: LevelUpPaperWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LevelUpPaperScalarFieldEnum | LevelUpPaperScalarFieldEnum[]
  }

  /**
   * LevelUpSubject.publishings
   */
  export type LevelUpSubject$publishingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPublishing
     */
    select?: LevelUpPublishingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPublishingInclude<ExtArgs> | null
    where?: LevelUpPublishingWhereInput
    orderBy?: LevelUpPublishingOrderByWithRelationInput | LevelUpPublishingOrderByWithRelationInput[]
    cursor?: LevelUpPublishingWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LevelUpPublishingScalarFieldEnum | LevelUpPublishingScalarFieldEnum[]
  }

  /**
   * LevelUpSubject without action
   */
  export type LevelUpSubjectDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpSubject
     */
    select?: LevelUpSubjectSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpSubjectInclude<ExtArgs> | null
  }


  /**
   * Model LevelUpQuestion
   */

  export type AggregateLevelUpQuestion = {
    _count: LevelUpQuestionCountAggregateOutputType | null
    _min: LevelUpQuestionMinAggregateOutputType | null
    _max: LevelUpQuestionMaxAggregateOutputType | null
  }

  export type LevelUpQuestionMinAggregateOutputType = {
    id: string | null
    subjectCode: string | null
    classLevel: string | null
    questionText: string | null
    difficulty: string | null
    correctOption: string | null
    explanation: string | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type LevelUpQuestionMaxAggregateOutputType = {
    id: string | null
    subjectCode: string | null
    classLevel: string | null
    questionText: string | null
    difficulty: string | null
    correctOption: string | null
    explanation: string | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type LevelUpQuestionCountAggregateOutputType = {
    id: number
    subjectCode: number
    classLevel: number
    questionText: number
    difficulty: number
    correctOption: number
    explanation: number
    isActive: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type LevelUpQuestionMinAggregateInputType = {
    id?: true
    subjectCode?: true
    classLevel?: true
    questionText?: true
    difficulty?: true
    correctOption?: true
    explanation?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
  }

  export type LevelUpQuestionMaxAggregateInputType = {
    id?: true
    subjectCode?: true
    classLevel?: true
    questionText?: true
    difficulty?: true
    correctOption?: true
    explanation?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
  }

  export type LevelUpQuestionCountAggregateInputType = {
    id?: true
    subjectCode?: true
    classLevel?: true
    questionText?: true
    difficulty?: true
    correctOption?: true
    explanation?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type LevelUpQuestionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LevelUpQuestion to aggregate.
     */
    where?: LevelUpQuestionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpQuestions to fetch.
     */
    orderBy?: LevelUpQuestionOrderByWithRelationInput | LevelUpQuestionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: LevelUpQuestionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpQuestions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpQuestions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned LevelUpQuestions
    **/
    _count?: true | LevelUpQuestionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: LevelUpQuestionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: LevelUpQuestionMaxAggregateInputType
  }

  export type GetLevelUpQuestionAggregateType<T extends LevelUpQuestionAggregateArgs> = {
        [P in keyof T & keyof AggregateLevelUpQuestion]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLevelUpQuestion[P]>
      : GetScalarType<T[P], AggregateLevelUpQuestion[P]>
  }




  export type LevelUpQuestionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LevelUpQuestionWhereInput
    orderBy?: LevelUpQuestionOrderByWithAggregationInput | LevelUpQuestionOrderByWithAggregationInput[]
    by: LevelUpQuestionScalarFieldEnum[] | LevelUpQuestionScalarFieldEnum
    having?: LevelUpQuestionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: LevelUpQuestionCountAggregateInputType | true
    _min?: LevelUpQuestionMinAggregateInputType
    _max?: LevelUpQuestionMaxAggregateInputType
  }

  export type LevelUpQuestionGroupByOutputType = {
    id: string
    subjectCode: string
    classLevel: string
    questionText: string
    difficulty: string
    correctOption: string
    explanation: string | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    _count: LevelUpQuestionCountAggregateOutputType | null
    _min: LevelUpQuestionMinAggregateOutputType | null
    _max: LevelUpQuestionMaxAggregateOutputType | null
  }

  type GetLevelUpQuestionGroupByPayload<T extends LevelUpQuestionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<LevelUpQuestionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof LevelUpQuestionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], LevelUpQuestionGroupByOutputType[P]>
            : GetScalarType<T[P], LevelUpQuestionGroupByOutputType[P]>
        }
      >
    >


  export type LevelUpQuestionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    subjectCode?: boolean
    classLevel?: boolean
    questionText?: boolean
    difficulty?: boolean
    correctOption?: boolean
    explanation?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    subject?: boolean | LevelUpSubjectDefaultArgs<ExtArgs>
    options?: boolean | LevelUpQuestion$optionsArgs<ExtArgs>
    paperLinks?: boolean | LevelUpQuestion$paperLinksArgs<ExtArgs>
    _count?: boolean | LevelUpQuestionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["levelUpQuestion"]>

  export type LevelUpQuestionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    subjectCode?: boolean
    classLevel?: boolean
    questionText?: boolean
    difficulty?: boolean
    correctOption?: boolean
    explanation?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    subject?: boolean | LevelUpSubjectDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["levelUpQuestion"]>

  export type LevelUpQuestionSelectScalar = {
    id?: boolean
    subjectCode?: boolean
    classLevel?: boolean
    questionText?: boolean
    difficulty?: boolean
    correctOption?: boolean
    explanation?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type LevelUpQuestionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    subject?: boolean | LevelUpSubjectDefaultArgs<ExtArgs>
    options?: boolean | LevelUpQuestion$optionsArgs<ExtArgs>
    paperLinks?: boolean | LevelUpQuestion$paperLinksArgs<ExtArgs>
    _count?: boolean | LevelUpQuestionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type LevelUpQuestionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    subject?: boolean | LevelUpSubjectDefaultArgs<ExtArgs>
  }

  export type $LevelUpQuestionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "LevelUpQuestion"
    objects: {
      subject: Prisma.$LevelUpSubjectPayload<ExtArgs>
      options: Prisma.$LevelUpQuestionOptionPayload<ExtArgs>[]
      paperLinks: Prisma.$LevelUpPaperQuestionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      subjectCode: string
      classLevel: string
      questionText: string
      difficulty: string
      correctOption: string
      explanation: string | null
      isActive: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["levelUpQuestion"]>
    composites: {}
  }

  type LevelUpQuestionGetPayload<S extends boolean | null | undefined | LevelUpQuestionDefaultArgs> = $Result.GetResult<Prisma.$LevelUpQuestionPayload, S>

  type LevelUpQuestionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<LevelUpQuestionFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: LevelUpQuestionCountAggregateInputType | true
    }

  export interface LevelUpQuestionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['LevelUpQuestion'], meta: { name: 'LevelUpQuestion' } }
    /**
     * Find zero or one LevelUpQuestion that matches the filter.
     * @param {LevelUpQuestionFindUniqueArgs} args - Arguments to find a LevelUpQuestion
     * @example
     * // Get one LevelUpQuestion
     * const levelUpQuestion = await prisma.levelUpQuestion.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends LevelUpQuestionFindUniqueArgs>(args: SelectSubset<T, LevelUpQuestionFindUniqueArgs<ExtArgs>>): Prisma__LevelUpQuestionClient<$Result.GetResult<Prisma.$LevelUpQuestionPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one LevelUpQuestion that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {LevelUpQuestionFindUniqueOrThrowArgs} args - Arguments to find a LevelUpQuestion
     * @example
     * // Get one LevelUpQuestion
     * const levelUpQuestion = await prisma.levelUpQuestion.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends LevelUpQuestionFindUniqueOrThrowArgs>(args: SelectSubset<T, LevelUpQuestionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__LevelUpQuestionClient<$Result.GetResult<Prisma.$LevelUpQuestionPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first LevelUpQuestion that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpQuestionFindFirstArgs} args - Arguments to find a LevelUpQuestion
     * @example
     * // Get one LevelUpQuestion
     * const levelUpQuestion = await prisma.levelUpQuestion.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends LevelUpQuestionFindFirstArgs>(args?: SelectSubset<T, LevelUpQuestionFindFirstArgs<ExtArgs>>): Prisma__LevelUpQuestionClient<$Result.GetResult<Prisma.$LevelUpQuestionPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first LevelUpQuestion that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpQuestionFindFirstOrThrowArgs} args - Arguments to find a LevelUpQuestion
     * @example
     * // Get one LevelUpQuestion
     * const levelUpQuestion = await prisma.levelUpQuestion.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends LevelUpQuestionFindFirstOrThrowArgs>(args?: SelectSubset<T, LevelUpQuestionFindFirstOrThrowArgs<ExtArgs>>): Prisma__LevelUpQuestionClient<$Result.GetResult<Prisma.$LevelUpQuestionPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more LevelUpQuestions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpQuestionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all LevelUpQuestions
     * const levelUpQuestions = await prisma.levelUpQuestion.findMany()
     * 
     * // Get first 10 LevelUpQuestions
     * const levelUpQuestions = await prisma.levelUpQuestion.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const levelUpQuestionWithIdOnly = await prisma.levelUpQuestion.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends LevelUpQuestionFindManyArgs>(args?: SelectSubset<T, LevelUpQuestionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpQuestionPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a LevelUpQuestion.
     * @param {LevelUpQuestionCreateArgs} args - Arguments to create a LevelUpQuestion.
     * @example
     * // Create one LevelUpQuestion
     * const LevelUpQuestion = await prisma.levelUpQuestion.create({
     *   data: {
     *     // ... data to create a LevelUpQuestion
     *   }
     * })
     * 
     */
    create<T extends LevelUpQuestionCreateArgs>(args: SelectSubset<T, LevelUpQuestionCreateArgs<ExtArgs>>): Prisma__LevelUpQuestionClient<$Result.GetResult<Prisma.$LevelUpQuestionPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many LevelUpQuestions.
     * @param {LevelUpQuestionCreateManyArgs} args - Arguments to create many LevelUpQuestions.
     * @example
     * // Create many LevelUpQuestions
     * const levelUpQuestion = await prisma.levelUpQuestion.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends LevelUpQuestionCreateManyArgs>(args?: SelectSubset<T, LevelUpQuestionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many LevelUpQuestions and returns the data saved in the database.
     * @param {LevelUpQuestionCreateManyAndReturnArgs} args - Arguments to create many LevelUpQuestions.
     * @example
     * // Create many LevelUpQuestions
     * const levelUpQuestion = await prisma.levelUpQuestion.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many LevelUpQuestions and only return the `id`
     * const levelUpQuestionWithIdOnly = await prisma.levelUpQuestion.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends LevelUpQuestionCreateManyAndReturnArgs>(args?: SelectSubset<T, LevelUpQuestionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpQuestionPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a LevelUpQuestion.
     * @param {LevelUpQuestionDeleteArgs} args - Arguments to delete one LevelUpQuestion.
     * @example
     * // Delete one LevelUpQuestion
     * const LevelUpQuestion = await prisma.levelUpQuestion.delete({
     *   where: {
     *     // ... filter to delete one LevelUpQuestion
     *   }
     * })
     * 
     */
    delete<T extends LevelUpQuestionDeleteArgs>(args: SelectSubset<T, LevelUpQuestionDeleteArgs<ExtArgs>>): Prisma__LevelUpQuestionClient<$Result.GetResult<Prisma.$LevelUpQuestionPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one LevelUpQuestion.
     * @param {LevelUpQuestionUpdateArgs} args - Arguments to update one LevelUpQuestion.
     * @example
     * // Update one LevelUpQuestion
     * const levelUpQuestion = await prisma.levelUpQuestion.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends LevelUpQuestionUpdateArgs>(args: SelectSubset<T, LevelUpQuestionUpdateArgs<ExtArgs>>): Prisma__LevelUpQuestionClient<$Result.GetResult<Prisma.$LevelUpQuestionPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more LevelUpQuestions.
     * @param {LevelUpQuestionDeleteManyArgs} args - Arguments to filter LevelUpQuestions to delete.
     * @example
     * // Delete a few LevelUpQuestions
     * const { count } = await prisma.levelUpQuestion.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends LevelUpQuestionDeleteManyArgs>(args?: SelectSubset<T, LevelUpQuestionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more LevelUpQuestions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpQuestionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many LevelUpQuestions
     * const levelUpQuestion = await prisma.levelUpQuestion.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends LevelUpQuestionUpdateManyArgs>(args: SelectSubset<T, LevelUpQuestionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one LevelUpQuestion.
     * @param {LevelUpQuestionUpsertArgs} args - Arguments to update or create a LevelUpQuestion.
     * @example
     * // Update or create a LevelUpQuestion
     * const levelUpQuestion = await prisma.levelUpQuestion.upsert({
     *   create: {
     *     // ... data to create a LevelUpQuestion
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the LevelUpQuestion we want to update
     *   }
     * })
     */
    upsert<T extends LevelUpQuestionUpsertArgs>(args: SelectSubset<T, LevelUpQuestionUpsertArgs<ExtArgs>>): Prisma__LevelUpQuestionClient<$Result.GetResult<Prisma.$LevelUpQuestionPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of LevelUpQuestions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpQuestionCountArgs} args - Arguments to filter LevelUpQuestions to count.
     * @example
     * // Count the number of LevelUpQuestions
     * const count = await prisma.levelUpQuestion.count({
     *   where: {
     *     // ... the filter for the LevelUpQuestions we want to count
     *   }
     * })
    **/
    count<T extends LevelUpQuestionCountArgs>(
      args?: Subset<T, LevelUpQuestionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], LevelUpQuestionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a LevelUpQuestion.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpQuestionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends LevelUpQuestionAggregateArgs>(args: Subset<T, LevelUpQuestionAggregateArgs>): Prisma.PrismaPromise<GetLevelUpQuestionAggregateType<T>>

    /**
     * Group by LevelUpQuestion.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpQuestionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends LevelUpQuestionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: LevelUpQuestionGroupByArgs['orderBy'] }
        : { orderBy?: LevelUpQuestionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, LevelUpQuestionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLevelUpQuestionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the LevelUpQuestion model
   */
  readonly fields: LevelUpQuestionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for LevelUpQuestion.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__LevelUpQuestionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    subject<T extends LevelUpSubjectDefaultArgs<ExtArgs> = {}>(args?: Subset<T, LevelUpSubjectDefaultArgs<ExtArgs>>): Prisma__LevelUpSubjectClient<$Result.GetResult<Prisma.$LevelUpSubjectPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    options<T extends LevelUpQuestion$optionsArgs<ExtArgs> = {}>(args?: Subset<T, LevelUpQuestion$optionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpQuestionOptionPayload<ExtArgs>, T, "findMany"> | Null>
    paperLinks<T extends LevelUpQuestion$paperLinksArgs<ExtArgs> = {}>(args?: Subset<T, LevelUpQuestion$paperLinksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpPaperQuestionPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the LevelUpQuestion model
   */ 
  interface LevelUpQuestionFieldRefs {
    readonly id: FieldRef<"LevelUpQuestion", 'String'>
    readonly subjectCode: FieldRef<"LevelUpQuestion", 'String'>
    readonly classLevel: FieldRef<"LevelUpQuestion", 'String'>
    readonly questionText: FieldRef<"LevelUpQuestion", 'String'>
    readonly difficulty: FieldRef<"LevelUpQuestion", 'String'>
    readonly correctOption: FieldRef<"LevelUpQuestion", 'String'>
    readonly explanation: FieldRef<"LevelUpQuestion", 'String'>
    readonly isActive: FieldRef<"LevelUpQuestion", 'Boolean'>
    readonly createdAt: FieldRef<"LevelUpQuestion", 'DateTime'>
    readonly updatedAt: FieldRef<"LevelUpQuestion", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * LevelUpQuestion findUnique
   */
  export type LevelUpQuestionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestion
     */
    select?: LevelUpQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpQuestion to fetch.
     */
    where: LevelUpQuestionWhereUniqueInput
  }

  /**
   * LevelUpQuestion findUniqueOrThrow
   */
  export type LevelUpQuestionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestion
     */
    select?: LevelUpQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpQuestion to fetch.
     */
    where: LevelUpQuestionWhereUniqueInput
  }

  /**
   * LevelUpQuestion findFirst
   */
  export type LevelUpQuestionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestion
     */
    select?: LevelUpQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpQuestion to fetch.
     */
    where?: LevelUpQuestionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpQuestions to fetch.
     */
    orderBy?: LevelUpQuestionOrderByWithRelationInput | LevelUpQuestionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LevelUpQuestions.
     */
    cursor?: LevelUpQuestionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpQuestions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpQuestions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LevelUpQuestions.
     */
    distinct?: LevelUpQuestionScalarFieldEnum | LevelUpQuestionScalarFieldEnum[]
  }

  /**
   * LevelUpQuestion findFirstOrThrow
   */
  export type LevelUpQuestionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestion
     */
    select?: LevelUpQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpQuestion to fetch.
     */
    where?: LevelUpQuestionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpQuestions to fetch.
     */
    orderBy?: LevelUpQuestionOrderByWithRelationInput | LevelUpQuestionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LevelUpQuestions.
     */
    cursor?: LevelUpQuestionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpQuestions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpQuestions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LevelUpQuestions.
     */
    distinct?: LevelUpQuestionScalarFieldEnum | LevelUpQuestionScalarFieldEnum[]
  }

  /**
   * LevelUpQuestion findMany
   */
  export type LevelUpQuestionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestion
     */
    select?: LevelUpQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpQuestions to fetch.
     */
    where?: LevelUpQuestionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpQuestions to fetch.
     */
    orderBy?: LevelUpQuestionOrderByWithRelationInput | LevelUpQuestionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing LevelUpQuestions.
     */
    cursor?: LevelUpQuestionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpQuestions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpQuestions.
     */
    skip?: number
    distinct?: LevelUpQuestionScalarFieldEnum | LevelUpQuestionScalarFieldEnum[]
  }

  /**
   * LevelUpQuestion create
   */
  export type LevelUpQuestionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestion
     */
    select?: LevelUpQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionInclude<ExtArgs> | null
    /**
     * The data needed to create a LevelUpQuestion.
     */
    data: XOR<LevelUpQuestionCreateInput, LevelUpQuestionUncheckedCreateInput>
  }

  /**
   * LevelUpQuestion createMany
   */
  export type LevelUpQuestionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many LevelUpQuestions.
     */
    data: LevelUpQuestionCreateManyInput | LevelUpQuestionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * LevelUpQuestion createManyAndReturn
   */
  export type LevelUpQuestionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestion
     */
    select?: LevelUpQuestionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many LevelUpQuestions.
     */
    data: LevelUpQuestionCreateManyInput | LevelUpQuestionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * LevelUpQuestion update
   */
  export type LevelUpQuestionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestion
     */
    select?: LevelUpQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionInclude<ExtArgs> | null
    /**
     * The data needed to update a LevelUpQuestion.
     */
    data: XOR<LevelUpQuestionUpdateInput, LevelUpQuestionUncheckedUpdateInput>
    /**
     * Choose, which LevelUpQuestion to update.
     */
    where: LevelUpQuestionWhereUniqueInput
  }

  /**
   * LevelUpQuestion updateMany
   */
  export type LevelUpQuestionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update LevelUpQuestions.
     */
    data: XOR<LevelUpQuestionUpdateManyMutationInput, LevelUpQuestionUncheckedUpdateManyInput>
    /**
     * Filter which LevelUpQuestions to update
     */
    where?: LevelUpQuestionWhereInput
  }

  /**
   * LevelUpQuestion upsert
   */
  export type LevelUpQuestionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestion
     */
    select?: LevelUpQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionInclude<ExtArgs> | null
    /**
     * The filter to search for the LevelUpQuestion to update in case it exists.
     */
    where: LevelUpQuestionWhereUniqueInput
    /**
     * In case the LevelUpQuestion found by the `where` argument doesn't exist, create a new LevelUpQuestion with this data.
     */
    create: XOR<LevelUpQuestionCreateInput, LevelUpQuestionUncheckedCreateInput>
    /**
     * In case the LevelUpQuestion was found with the provided `where` argument, update it with this data.
     */
    update: XOR<LevelUpQuestionUpdateInput, LevelUpQuestionUncheckedUpdateInput>
  }

  /**
   * LevelUpQuestion delete
   */
  export type LevelUpQuestionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestion
     */
    select?: LevelUpQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionInclude<ExtArgs> | null
    /**
     * Filter which LevelUpQuestion to delete.
     */
    where: LevelUpQuestionWhereUniqueInput
  }

  /**
   * LevelUpQuestion deleteMany
   */
  export type LevelUpQuestionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LevelUpQuestions to delete
     */
    where?: LevelUpQuestionWhereInput
  }

  /**
   * LevelUpQuestion.options
   */
  export type LevelUpQuestion$optionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestionOption
     */
    select?: LevelUpQuestionOptionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionOptionInclude<ExtArgs> | null
    where?: LevelUpQuestionOptionWhereInput
    orderBy?: LevelUpQuestionOptionOrderByWithRelationInput | LevelUpQuestionOptionOrderByWithRelationInput[]
    cursor?: LevelUpQuestionOptionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LevelUpQuestionOptionScalarFieldEnum | LevelUpQuestionOptionScalarFieldEnum[]
  }

  /**
   * LevelUpQuestion.paperLinks
   */
  export type LevelUpQuestion$paperLinksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaperQuestion
     */
    select?: LevelUpPaperQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperQuestionInclude<ExtArgs> | null
    where?: LevelUpPaperQuestionWhereInput
    orderBy?: LevelUpPaperQuestionOrderByWithRelationInput | LevelUpPaperQuestionOrderByWithRelationInput[]
    cursor?: LevelUpPaperQuestionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LevelUpPaperQuestionScalarFieldEnum | LevelUpPaperQuestionScalarFieldEnum[]
  }

  /**
   * LevelUpQuestion without action
   */
  export type LevelUpQuestionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestion
     */
    select?: LevelUpQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionInclude<ExtArgs> | null
  }


  /**
   * Model LevelUpQuestionOption
   */

  export type AggregateLevelUpQuestionOption = {
    _count: LevelUpQuestionOptionCountAggregateOutputType | null
    _avg: LevelUpQuestionOptionAvgAggregateOutputType | null
    _sum: LevelUpQuestionOptionSumAggregateOutputType | null
    _min: LevelUpQuestionOptionMinAggregateOutputType | null
    _max: LevelUpQuestionOptionMaxAggregateOutputType | null
  }

  export type LevelUpQuestionOptionAvgAggregateOutputType = {
    displayOrder: number | null
  }

  export type LevelUpQuestionOptionSumAggregateOutputType = {
    displayOrder: number | null
  }

  export type LevelUpQuestionOptionMinAggregateOutputType = {
    id: string | null
    questionId: string | null
    optionKey: string | null
    optionText: string | null
    displayOrder: number | null
  }

  export type LevelUpQuestionOptionMaxAggregateOutputType = {
    id: string | null
    questionId: string | null
    optionKey: string | null
    optionText: string | null
    displayOrder: number | null
  }

  export type LevelUpQuestionOptionCountAggregateOutputType = {
    id: number
    questionId: number
    optionKey: number
    optionText: number
    displayOrder: number
    _all: number
  }


  export type LevelUpQuestionOptionAvgAggregateInputType = {
    displayOrder?: true
  }

  export type LevelUpQuestionOptionSumAggregateInputType = {
    displayOrder?: true
  }

  export type LevelUpQuestionOptionMinAggregateInputType = {
    id?: true
    questionId?: true
    optionKey?: true
    optionText?: true
    displayOrder?: true
  }

  export type LevelUpQuestionOptionMaxAggregateInputType = {
    id?: true
    questionId?: true
    optionKey?: true
    optionText?: true
    displayOrder?: true
  }

  export type LevelUpQuestionOptionCountAggregateInputType = {
    id?: true
    questionId?: true
    optionKey?: true
    optionText?: true
    displayOrder?: true
    _all?: true
  }

  export type LevelUpQuestionOptionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LevelUpQuestionOption to aggregate.
     */
    where?: LevelUpQuestionOptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpQuestionOptions to fetch.
     */
    orderBy?: LevelUpQuestionOptionOrderByWithRelationInput | LevelUpQuestionOptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: LevelUpQuestionOptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpQuestionOptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpQuestionOptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned LevelUpQuestionOptions
    **/
    _count?: true | LevelUpQuestionOptionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: LevelUpQuestionOptionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: LevelUpQuestionOptionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: LevelUpQuestionOptionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: LevelUpQuestionOptionMaxAggregateInputType
  }

  export type GetLevelUpQuestionOptionAggregateType<T extends LevelUpQuestionOptionAggregateArgs> = {
        [P in keyof T & keyof AggregateLevelUpQuestionOption]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLevelUpQuestionOption[P]>
      : GetScalarType<T[P], AggregateLevelUpQuestionOption[P]>
  }




  export type LevelUpQuestionOptionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LevelUpQuestionOptionWhereInput
    orderBy?: LevelUpQuestionOptionOrderByWithAggregationInput | LevelUpQuestionOptionOrderByWithAggregationInput[]
    by: LevelUpQuestionOptionScalarFieldEnum[] | LevelUpQuestionOptionScalarFieldEnum
    having?: LevelUpQuestionOptionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: LevelUpQuestionOptionCountAggregateInputType | true
    _avg?: LevelUpQuestionOptionAvgAggregateInputType
    _sum?: LevelUpQuestionOptionSumAggregateInputType
    _min?: LevelUpQuestionOptionMinAggregateInputType
    _max?: LevelUpQuestionOptionMaxAggregateInputType
  }

  export type LevelUpQuestionOptionGroupByOutputType = {
    id: string
    questionId: string
    optionKey: string
    optionText: string
    displayOrder: number
    _count: LevelUpQuestionOptionCountAggregateOutputType | null
    _avg: LevelUpQuestionOptionAvgAggregateOutputType | null
    _sum: LevelUpQuestionOptionSumAggregateOutputType | null
    _min: LevelUpQuestionOptionMinAggregateOutputType | null
    _max: LevelUpQuestionOptionMaxAggregateOutputType | null
  }

  type GetLevelUpQuestionOptionGroupByPayload<T extends LevelUpQuestionOptionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<LevelUpQuestionOptionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof LevelUpQuestionOptionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], LevelUpQuestionOptionGroupByOutputType[P]>
            : GetScalarType<T[P], LevelUpQuestionOptionGroupByOutputType[P]>
        }
      >
    >


  export type LevelUpQuestionOptionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    questionId?: boolean
    optionKey?: boolean
    optionText?: boolean
    displayOrder?: boolean
    question?: boolean | LevelUpQuestionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["levelUpQuestionOption"]>

  export type LevelUpQuestionOptionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    questionId?: boolean
    optionKey?: boolean
    optionText?: boolean
    displayOrder?: boolean
    question?: boolean | LevelUpQuestionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["levelUpQuestionOption"]>

  export type LevelUpQuestionOptionSelectScalar = {
    id?: boolean
    questionId?: boolean
    optionKey?: boolean
    optionText?: boolean
    displayOrder?: boolean
  }

  export type LevelUpQuestionOptionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    question?: boolean | LevelUpQuestionDefaultArgs<ExtArgs>
  }
  export type LevelUpQuestionOptionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    question?: boolean | LevelUpQuestionDefaultArgs<ExtArgs>
  }

  export type $LevelUpQuestionOptionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "LevelUpQuestionOption"
    objects: {
      question: Prisma.$LevelUpQuestionPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      questionId: string
      optionKey: string
      optionText: string
      displayOrder: number
    }, ExtArgs["result"]["levelUpQuestionOption"]>
    composites: {}
  }

  type LevelUpQuestionOptionGetPayload<S extends boolean | null | undefined | LevelUpQuestionOptionDefaultArgs> = $Result.GetResult<Prisma.$LevelUpQuestionOptionPayload, S>

  type LevelUpQuestionOptionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<LevelUpQuestionOptionFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: LevelUpQuestionOptionCountAggregateInputType | true
    }

  export interface LevelUpQuestionOptionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['LevelUpQuestionOption'], meta: { name: 'LevelUpQuestionOption' } }
    /**
     * Find zero or one LevelUpQuestionOption that matches the filter.
     * @param {LevelUpQuestionOptionFindUniqueArgs} args - Arguments to find a LevelUpQuestionOption
     * @example
     * // Get one LevelUpQuestionOption
     * const levelUpQuestionOption = await prisma.levelUpQuestionOption.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends LevelUpQuestionOptionFindUniqueArgs>(args: SelectSubset<T, LevelUpQuestionOptionFindUniqueArgs<ExtArgs>>): Prisma__LevelUpQuestionOptionClient<$Result.GetResult<Prisma.$LevelUpQuestionOptionPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one LevelUpQuestionOption that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {LevelUpQuestionOptionFindUniqueOrThrowArgs} args - Arguments to find a LevelUpQuestionOption
     * @example
     * // Get one LevelUpQuestionOption
     * const levelUpQuestionOption = await prisma.levelUpQuestionOption.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends LevelUpQuestionOptionFindUniqueOrThrowArgs>(args: SelectSubset<T, LevelUpQuestionOptionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__LevelUpQuestionOptionClient<$Result.GetResult<Prisma.$LevelUpQuestionOptionPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first LevelUpQuestionOption that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpQuestionOptionFindFirstArgs} args - Arguments to find a LevelUpQuestionOption
     * @example
     * // Get one LevelUpQuestionOption
     * const levelUpQuestionOption = await prisma.levelUpQuestionOption.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends LevelUpQuestionOptionFindFirstArgs>(args?: SelectSubset<T, LevelUpQuestionOptionFindFirstArgs<ExtArgs>>): Prisma__LevelUpQuestionOptionClient<$Result.GetResult<Prisma.$LevelUpQuestionOptionPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first LevelUpQuestionOption that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpQuestionOptionFindFirstOrThrowArgs} args - Arguments to find a LevelUpQuestionOption
     * @example
     * // Get one LevelUpQuestionOption
     * const levelUpQuestionOption = await prisma.levelUpQuestionOption.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends LevelUpQuestionOptionFindFirstOrThrowArgs>(args?: SelectSubset<T, LevelUpQuestionOptionFindFirstOrThrowArgs<ExtArgs>>): Prisma__LevelUpQuestionOptionClient<$Result.GetResult<Prisma.$LevelUpQuestionOptionPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more LevelUpQuestionOptions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpQuestionOptionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all LevelUpQuestionOptions
     * const levelUpQuestionOptions = await prisma.levelUpQuestionOption.findMany()
     * 
     * // Get first 10 LevelUpQuestionOptions
     * const levelUpQuestionOptions = await prisma.levelUpQuestionOption.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const levelUpQuestionOptionWithIdOnly = await prisma.levelUpQuestionOption.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends LevelUpQuestionOptionFindManyArgs>(args?: SelectSubset<T, LevelUpQuestionOptionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpQuestionOptionPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a LevelUpQuestionOption.
     * @param {LevelUpQuestionOptionCreateArgs} args - Arguments to create a LevelUpQuestionOption.
     * @example
     * // Create one LevelUpQuestionOption
     * const LevelUpQuestionOption = await prisma.levelUpQuestionOption.create({
     *   data: {
     *     // ... data to create a LevelUpQuestionOption
     *   }
     * })
     * 
     */
    create<T extends LevelUpQuestionOptionCreateArgs>(args: SelectSubset<T, LevelUpQuestionOptionCreateArgs<ExtArgs>>): Prisma__LevelUpQuestionOptionClient<$Result.GetResult<Prisma.$LevelUpQuestionOptionPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many LevelUpQuestionOptions.
     * @param {LevelUpQuestionOptionCreateManyArgs} args - Arguments to create many LevelUpQuestionOptions.
     * @example
     * // Create many LevelUpQuestionOptions
     * const levelUpQuestionOption = await prisma.levelUpQuestionOption.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends LevelUpQuestionOptionCreateManyArgs>(args?: SelectSubset<T, LevelUpQuestionOptionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many LevelUpQuestionOptions and returns the data saved in the database.
     * @param {LevelUpQuestionOptionCreateManyAndReturnArgs} args - Arguments to create many LevelUpQuestionOptions.
     * @example
     * // Create many LevelUpQuestionOptions
     * const levelUpQuestionOption = await prisma.levelUpQuestionOption.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many LevelUpQuestionOptions and only return the `id`
     * const levelUpQuestionOptionWithIdOnly = await prisma.levelUpQuestionOption.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends LevelUpQuestionOptionCreateManyAndReturnArgs>(args?: SelectSubset<T, LevelUpQuestionOptionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpQuestionOptionPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a LevelUpQuestionOption.
     * @param {LevelUpQuestionOptionDeleteArgs} args - Arguments to delete one LevelUpQuestionOption.
     * @example
     * // Delete one LevelUpQuestionOption
     * const LevelUpQuestionOption = await prisma.levelUpQuestionOption.delete({
     *   where: {
     *     // ... filter to delete one LevelUpQuestionOption
     *   }
     * })
     * 
     */
    delete<T extends LevelUpQuestionOptionDeleteArgs>(args: SelectSubset<T, LevelUpQuestionOptionDeleteArgs<ExtArgs>>): Prisma__LevelUpQuestionOptionClient<$Result.GetResult<Prisma.$LevelUpQuestionOptionPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one LevelUpQuestionOption.
     * @param {LevelUpQuestionOptionUpdateArgs} args - Arguments to update one LevelUpQuestionOption.
     * @example
     * // Update one LevelUpQuestionOption
     * const levelUpQuestionOption = await prisma.levelUpQuestionOption.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends LevelUpQuestionOptionUpdateArgs>(args: SelectSubset<T, LevelUpQuestionOptionUpdateArgs<ExtArgs>>): Prisma__LevelUpQuestionOptionClient<$Result.GetResult<Prisma.$LevelUpQuestionOptionPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more LevelUpQuestionOptions.
     * @param {LevelUpQuestionOptionDeleteManyArgs} args - Arguments to filter LevelUpQuestionOptions to delete.
     * @example
     * // Delete a few LevelUpQuestionOptions
     * const { count } = await prisma.levelUpQuestionOption.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends LevelUpQuestionOptionDeleteManyArgs>(args?: SelectSubset<T, LevelUpQuestionOptionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more LevelUpQuestionOptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpQuestionOptionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many LevelUpQuestionOptions
     * const levelUpQuestionOption = await prisma.levelUpQuestionOption.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends LevelUpQuestionOptionUpdateManyArgs>(args: SelectSubset<T, LevelUpQuestionOptionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one LevelUpQuestionOption.
     * @param {LevelUpQuestionOptionUpsertArgs} args - Arguments to update or create a LevelUpQuestionOption.
     * @example
     * // Update or create a LevelUpQuestionOption
     * const levelUpQuestionOption = await prisma.levelUpQuestionOption.upsert({
     *   create: {
     *     // ... data to create a LevelUpQuestionOption
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the LevelUpQuestionOption we want to update
     *   }
     * })
     */
    upsert<T extends LevelUpQuestionOptionUpsertArgs>(args: SelectSubset<T, LevelUpQuestionOptionUpsertArgs<ExtArgs>>): Prisma__LevelUpQuestionOptionClient<$Result.GetResult<Prisma.$LevelUpQuestionOptionPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of LevelUpQuestionOptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpQuestionOptionCountArgs} args - Arguments to filter LevelUpQuestionOptions to count.
     * @example
     * // Count the number of LevelUpQuestionOptions
     * const count = await prisma.levelUpQuestionOption.count({
     *   where: {
     *     // ... the filter for the LevelUpQuestionOptions we want to count
     *   }
     * })
    **/
    count<T extends LevelUpQuestionOptionCountArgs>(
      args?: Subset<T, LevelUpQuestionOptionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], LevelUpQuestionOptionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a LevelUpQuestionOption.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpQuestionOptionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends LevelUpQuestionOptionAggregateArgs>(args: Subset<T, LevelUpQuestionOptionAggregateArgs>): Prisma.PrismaPromise<GetLevelUpQuestionOptionAggregateType<T>>

    /**
     * Group by LevelUpQuestionOption.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpQuestionOptionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends LevelUpQuestionOptionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: LevelUpQuestionOptionGroupByArgs['orderBy'] }
        : { orderBy?: LevelUpQuestionOptionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, LevelUpQuestionOptionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLevelUpQuestionOptionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the LevelUpQuestionOption model
   */
  readonly fields: LevelUpQuestionOptionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for LevelUpQuestionOption.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__LevelUpQuestionOptionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    question<T extends LevelUpQuestionDefaultArgs<ExtArgs> = {}>(args?: Subset<T, LevelUpQuestionDefaultArgs<ExtArgs>>): Prisma__LevelUpQuestionClient<$Result.GetResult<Prisma.$LevelUpQuestionPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the LevelUpQuestionOption model
   */ 
  interface LevelUpQuestionOptionFieldRefs {
    readonly id: FieldRef<"LevelUpQuestionOption", 'String'>
    readonly questionId: FieldRef<"LevelUpQuestionOption", 'String'>
    readonly optionKey: FieldRef<"LevelUpQuestionOption", 'String'>
    readonly optionText: FieldRef<"LevelUpQuestionOption", 'String'>
    readonly displayOrder: FieldRef<"LevelUpQuestionOption", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * LevelUpQuestionOption findUnique
   */
  export type LevelUpQuestionOptionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestionOption
     */
    select?: LevelUpQuestionOptionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionOptionInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpQuestionOption to fetch.
     */
    where: LevelUpQuestionOptionWhereUniqueInput
  }

  /**
   * LevelUpQuestionOption findUniqueOrThrow
   */
  export type LevelUpQuestionOptionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestionOption
     */
    select?: LevelUpQuestionOptionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionOptionInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpQuestionOption to fetch.
     */
    where: LevelUpQuestionOptionWhereUniqueInput
  }

  /**
   * LevelUpQuestionOption findFirst
   */
  export type LevelUpQuestionOptionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestionOption
     */
    select?: LevelUpQuestionOptionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionOptionInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpQuestionOption to fetch.
     */
    where?: LevelUpQuestionOptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpQuestionOptions to fetch.
     */
    orderBy?: LevelUpQuestionOptionOrderByWithRelationInput | LevelUpQuestionOptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LevelUpQuestionOptions.
     */
    cursor?: LevelUpQuestionOptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpQuestionOptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpQuestionOptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LevelUpQuestionOptions.
     */
    distinct?: LevelUpQuestionOptionScalarFieldEnum | LevelUpQuestionOptionScalarFieldEnum[]
  }

  /**
   * LevelUpQuestionOption findFirstOrThrow
   */
  export type LevelUpQuestionOptionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestionOption
     */
    select?: LevelUpQuestionOptionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionOptionInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpQuestionOption to fetch.
     */
    where?: LevelUpQuestionOptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpQuestionOptions to fetch.
     */
    orderBy?: LevelUpQuestionOptionOrderByWithRelationInput | LevelUpQuestionOptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LevelUpQuestionOptions.
     */
    cursor?: LevelUpQuestionOptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpQuestionOptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpQuestionOptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LevelUpQuestionOptions.
     */
    distinct?: LevelUpQuestionOptionScalarFieldEnum | LevelUpQuestionOptionScalarFieldEnum[]
  }

  /**
   * LevelUpQuestionOption findMany
   */
  export type LevelUpQuestionOptionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestionOption
     */
    select?: LevelUpQuestionOptionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionOptionInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpQuestionOptions to fetch.
     */
    where?: LevelUpQuestionOptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpQuestionOptions to fetch.
     */
    orderBy?: LevelUpQuestionOptionOrderByWithRelationInput | LevelUpQuestionOptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing LevelUpQuestionOptions.
     */
    cursor?: LevelUpQuestionOptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpQuestionOptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpQuestionOptions.
     */
    skip?: number
    distinct?: LevelUpQuestionOptionScalarFieldEnum | LevelUpQuestionOptionScalarFieldEnum[]
  }

  /**
   * LevelUpQuestionOption create
   */
  export type LevelUpQuestionOptionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestionOption
     */
    select?: LevelUpQuestionOptionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionOptionInclude<ExtArgs> | null
    /**
     * The data needed to create a LevelUpQuestionOption.
     */
    data: XOR<LevelUpQuestionOptionCreateInput, LevelUpQuestionOptionUncheckedCreateInput>
  }

  /**
   * LevelUpQuestionOption createMany
   */
  export type LevelUpQuestionOptionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many LevelUpQuestionOptions.
     */
    data: LevelUpQuestionOptionCreateManyInput | LevelUpQuestionOptionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * LevelUpQuestionOption createManyAndReturn
   */
  export type LevelUpQuestionOptionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestionOption
     */
    select?: LevelUpQuestionOptionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many LevelUpQuestionOptions.
     */
    data: LevelUpQuestionOptionCreateManyInput | LevelUpQuestionOptionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionOptionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * LevelUpQuestionOption update
   */
  export type LevelUpQuestionOptionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestionOption
     */
    select?: LevelUpQuestionOptionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionOptionInclude<ExtArgs> | null
    /**
     * The data needed to update a LevelUpQuestionOption.
     */
    data: XOR<LevelUpQuestionOptionUpdateInput, LevelUpQuestionOptionUncheckedUpdateInput>
    /**
     * Choose, which LevelUpQuestionOption to update.
     */
    where: LevelUpQuestionOptionWhereUniqueInput
  }

  /**
   * LevelUpQuestionOption updateMany
   */
  export type LevelUpQuestionOptionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update LevelUpQuestionOptions.
     */
    data: XOR<LevelUpQuestionOptionUpdateManyMutationInput, LevelUpQuestionOptionUncheckedUpdateManyInput>
    /**
     * Filter which LevelUpQuestionOptions to update
     */
    where?: LevelUpQuestionOptionWhereInput
  }

  /**
   * LevelUpQuestionOption upsert
   */
  export type LevelUpQuestionOptionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestionOption
     */
    select?: LevelUpQuestionOptionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionOptionInclude<ExtArgs> | null
    /**
     * The filter to search for the LevelUpQuestionOption to update in case it exists.
     */
    where: LevelUpQuestionOptionWhereUniqueInput
    /**
     * In case the LevelUpQuestionOption found by the `where` argument doesn't exist, create a new LevelUpQuestionOption with this data.
     */
    create: XOR<LevelUpQuestionOptionCreateInput, LevelUpQuestionOptionUncheckedCreateInput>
    /**
     * In case the LevelUpQuestionOption was found with the provided `where` argument, update it with this data.
     */
    update: XOR<LevelUpQuestionOptionUpdateInput, LevelUpQuestionOptionUncheckedUpdateInput>
  }

  /**
   * LevelUpQuestionOption delete
   */
  export type LevelUpQuestionOptionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestionOption
     */
    select?: LevelUpQuestionOptionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionOptionInclude<ExtArgs> | null
    /**
     * Filter which LevelUpQuestionOption to delete.
     */
    where: LevelUpQuestionOptionWhereUniqueInput
  }

  /**
   * LevelUpQuestionOption deleteMany
   */
  export type LevelUpQuestionOptionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LevelUpQuestionOptions to delete
     */
    where?: LevelUpQuestionOptionWhereInput
  }

  /**
   * LevelUpQuestionOption without action
   */
  export type LevelUpQuestionOptionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpQuestionOption
     */
    select?: LevelUpQuestionOptionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpQuestionOptionInclude<ExtArgs> | null
  }


  /**
   * Model LevelUpPaper
   */

  export type AggregateLevelUpPaper = {
    _count: LevelUpPaperCountAggregateOutputType | null
    _avg: LevelUpPaperAvgAggregateOutputType | null
    _sum: LevelUpPaperSumAggregateOutputType | null
    _min: LevelUpPaperMinAggregateOutputType | null
    _max: LevelUpPaperMaxAggregateOutputType | null
  }

  export type LevelUpPaperAvgAggregateOutputType = {
    durationMinutes: number | null
    totalQuestions: number | null
    totalMarks: number | null
  }

  export type LevelUpPaperSumAggregateOutputType = {
    durationMinutes: number | null
    totalQuestions: number | null
    totalMarks: number | null
  }

  export type LevelUpPaperMinAggregateOutputType = {
    id: string | null
    title: string | null
    subjectCode: string | null
    classLevel: string | null
    durationMinutes: number | null
    totalQuestions: number | null
    totalMarks: number | null
    status: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type LevelUpPaperMaxAggregateOutputType = {
    id: string | null
    title: string | null
    subjectCode: string | null
    classLevel: string | null
    durationMinutes: number | null
    totalQuestions: number | null
    totalMarks: number | null
    status: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type LevelUpPaperCountAggregateOutputType = {
    id: number
    title: number
    subjectCode: number
    classLevel: number
    durationMinutes: number
    totalQuestions: number
    totalMarks: number
    status: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type LevelUpPaperAvgAggregateInputType = {
    durationMinutes?: true
    totalQuestions?: true
    totalMarks?: true
  }

  export type LevelUpPaperSumAggregateInputType = {
    durationMinutes?: true
    totalQuestions?: true
    totalMarks?: true
  }

  export type LevelUpPaperMinAggregateInputType = {
    id?: true
    title?: true
    subjectCode?: true
    classLevel?: true
    durationMinutes?: true
    totalQuestions?: true
    totalMarks?: true
    status?: true
    createdAt?: true
    updatedAt?: true
  }

  export type LevelUpPaperMaxAggregateInputType = {
    id?: true
    title?: true
    subjectCode?: true
    classLevel?: true
    durationMinutes?: true
    totalQuestions?: true
    totalMarks?: true
    status?: true
    createdAt?: true
    updatedAt?: true
  }

  export type LevelUpPaperCountAggregateInputType = {
    id?: true
    title?: true
    subjectCode?: true
    classLevel?: true
    durationMinutes?: true
    totalQuestions?: true
    totalMarks?: true
    status?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type LevelUpPaperAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LevelUpPaper to aggregate.
     */
    where?: LevelUpPaperWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpPapers to fetch.
     */
    orderBy?: LevelUpPaperOrderByWithRelationInput | LevelUpPaperOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: LevelUpPaperWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpPapers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpPapers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned LevelUpPapers
    **/
    _count?: true | LevelUpPaperCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: LevelUpPaperAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: LevelUpPaperSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: LevelUpPaperMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: LevelUpPaperMaxAggregateInputType
  }

  export type GetLevelUpPaperAggregateType<T extends LevelUpPaperAggregateArgs> = {
        [P in keyof T & keyof AggregateLevelUpPaper]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLevelUpPaper[P]>
      : GetScalarType<T[P], AggregateLevelUpPaper[P]>
  }




  export type LevelUpPaperGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LevelUpPaperWhereInput
    orderBy?: LevelUpPaperOrderByWithAggregationInput | LevelUpPaperOrderByWithAggregationInput[]
    by: LevelUpPaperScalarFieldEnum[] | LevelUpPaperScalarFieldEnum
    having?: LevelUpPaperScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: LevelUpPaperCountAggregateInputType | true
    _avg?: LevelUpPaperAvgAggregateInputType
    _sum?: LevelUpPaperSumAggregateInputType
    _min?: LevelUpPaperMinAggregateInputType
    _max?: LevelUpPaperMaxAggregateInputType
  }

  export type LevelUpPaperGroupByOutputType = {
    id: string
    title: string
    subjectCode: string
    classLevel: string
    durationMinutes: number
    totalQuestions: number
    totalMarks: number
    status: string
    createdAt: Date
    updatedAt: Date
    _count: LevelUpPaperCountAggregateOutputType | null
    _avg: LevelUpPaperAvgAggregateOutputType | null
    _sum: LevelUpPaperSumAggregateOutputType | null
    _min: LevelUpPaperMinAggregateOutputType | null
    _max: LevelUpPaperMaxAggregateOutputType | null
  }

  type GetLevelUpPaperGroupByPayload<T extends LevelUpPaperGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<LevelUpPaperGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof LevelUpPaperGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], LevelUpPaperGroupByOutputType[P]>
            : GetScalarType<T[P], LevelUpPaperGroupByOutputType[P]>
        }
      >
    >


  export type LevelUpPaperSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    subjectCode?: boolean
    classLevel?: boolean
    durationMinutes?: boolean
    totalQuestions?: boolean
    totalMarks?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    subject?: boolean | LevelUpSubjectDefaultArgs<ExtArgs>
    questions?: boolean | LevelUpPaper$questionsArgs<ExtArgs>
    publishings?: boolean | LevelUpPaper$publishingsArgs<ExtArgs>
    _count?: boolean | LevelUpPaperCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["levelUpPaper"]>

  export type LevelUpPaperSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    subjectCode?: boolean
    classLevel?: boolean
    durationMinutes?: boolean
    totalQuestions?: boolean
    totalMarks?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    subject?: boolean | LevelUpSubjectDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["levelUpPaper"]>

  export type LevelUpPaperSelectScalar = {
    id?: boolean
    title?: boolean
    subjectCode?: boolean
    classLevel?: boolean
    durationMinutes?: boolean
    totalQuestions?: boolean
    totalMarks?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type LevelUpPaperInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    subject?: boolean | LevelUpSubjectDefaultArgs<ExtArgs>
    questions?: boolean | LevelUpPaper$questionsArgs<ExtArgs>
    publishings?: boolean | LevelUpPaper$publishingsArgs<ExtArgs>
    _count?: boolean | LevelUpPaperCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type LevelUpPaperIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    subject?: boolean | LevelUpSubjectDefaultArgs<ExtArgs>
  }

  export type $LevelUpPaperPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "LevelUpPaper"
    objects: {
      subject: Prisma.$LevelUpSubjectPayload<ExtArgs>
      questions: Prisma.$LevelUpPaperQuestionPayload<ExtArgs>[]
      publishings: Prisma.$LevelUpPublishingPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      title: string
      subjectCode: string
      classLevel: string
      durationMinutes: number
      totalQuestions: number
      totalMarks: number
      status: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["levelUpPaper"]>
    composites: {}
  }

  type LevelUpPaperGetPayload<S extends boolean | null | undefined | LevelUpPaperDefaultArgs> = $Result.GetResult<Prisma.$LevelUpPaperPayload, S>

  type LevelUpPaperCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<LevelUpPaperFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: LevelUpPaperCountAggregateInputType | true
    }

  export interface LevelUpPaperDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['LevelUpPaper'], meta: { name: 'LevelUpPaper' } }
    /**
     * Find zero or one LevelUpPaper that matches the filter.
     * @param {LevelUpPaperFindUniqueArgs} args - Arguments to find a LevelUpPaper
     * @example
     * // Get one LevelUpPaper
     * const levelUpPaper = await prisma.levelUpPaper.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends LevelUpPaperFindUniqueArgs>(args: SelectSubset<T, LevelUpPaperFindUniqueArgs<ExtArgs>>): Prisma__LevelUpPaperClient<$Result.GetResult<Prisma.$LevelUpPaperPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one LevelUpPaper that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {LevelUpPaperFindUniqueOrThrowArgs} args - Arguments to find a LevelUpPaper
     * @example
     * // Get one LevelUpPaper
     * const levelUpPaper = await prisma.levelUpPaper.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends LevelUpPaperFindUniqueOrThrowArgs>(args: SelectSubset<T, LevelUpPaperFindUniqueOrThrowArgs<ExtArgs>>): Prisma__LevelUpPaperClient<$Result.GetResult<Prisma.$LevelUpPaperPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first LevelUpPaper that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPaperFindFirstArgs} args - Arguments to find a LevelUpPaper
     * @example
     * // Get one LevelUpPaper
     * const levelUpPaper = await prisma.levelUpPaper.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends LevelUpPaperFindFirstArgs>(args?: SelectSubset<T, LevelUpPaperFindFirstArgs<ExtArgs>>): Prisma__LevelUpPaperClient<$Result.GetResult<Prisma.$LevelUpPaperPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first LevelUpPaper that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPaperFindFirstOrThrowArgs} args - Arguments to find a LevelUpPaper
     * @example
     * // Get one LevelUpPaper
     * const levelUpPaper = await prisma.levelUpPaper.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends LevelUpPaperFindFirstOrThrowArgs>(args?: SelectSubset<T, LevelUpPaperFindFirstOrThrowArgs<ExtArgs>>): Prisma__LevelUpPaperClient<$Result.GetResult<Prisma.$LevelUpPaperPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more LevelUpPapers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPaperFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all LevelUpPapers
     * const levelUpPapers = await prisma.levelUpPaper.findMany()
     * 
     * // Get first 10 LevelUpPapers
     * const levelUpPapers = await prisma.levelUpPaper.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const levelUpPaperWithIdOnly = await prisma.levelUpPaper.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends LevelUpPaperFindManyArgs>(args?: SelectSubset<T, LevelUpPaperFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpPaperPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a LevelUpPaper.
     * @param {LevelUpPaperCreateArgs} args - Arguments to create a LevelUpPaper.
     * @example
     * // Create one LevelUpPaper
     * const LevelUpPaper = await prisma.levelUpPaper.create({
     *   data: {
     *     // ... data to create a LevelUpPaper
     *   }
     * })
     * 
     */
    create<T extends LevelUpPaperCreateArgs>(args: SelectSubset<T, LevelUpPaperCreateArgs<ExtArgs>>): Prisma__LevelUpPaperClient<$Result.GetResult<Prisma.$LevelUpPaperPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many LevelUpPapers.
     * @param {LevelUpPaperCreateManyArgs} args - Arguments to create many LevelUpPapers.
     * @example
     * // Create many LevelUpPapers
     * const levelUpPaper = await prisma.levelUpPaper.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends LevelUpPaperCreateManyArgs>(args?: SelectSubset<T, LevelUpPaperCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many LevelUpPapers and returns the data saved in the database.
     * @param {LevelUpPaperCreateManyAndReturnArgs} args - Arguments to create many LevelUpPapers.
     * @example
     * // Create many LevelUpPapers
     * const levelUpPaper = await prisma.levelUpPaper.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many LevelUpPapers and only return the `id`
     * const levelUpPaperWithIdOnly = await prisma.levelUpPaper.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends LevelUpPaperCreateManyAndReturnArgs>(args?: SelectSubset<T, LevelUpPaperCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpPaperPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a LevelUpPaper.
     * @param {LevelUpPaperDeleteArgs} args - Arguments to delete one LevelUpPaper.
     * @example
     * // Delete one LevelUpPaper
     * const LevelUpPaper = await prisma.levelUpPaper.delete({
     *   where: {
     *     // ... filter to delete one LevelUpPaper
     *   }
     * })
     * 
     */
    delete<T extends LevelUpPaperDeleteArgs>(args: SelectSubset<T, LevelUpPaperDeleteArgs<ExtArgs>>): Prisma__LevelUpPaperClient<$Result.GetResult<Prisma.$LevelUpPaperPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one LevelUpPaper.
     * @param {LevelUpPaperUpdateArgs} args - Arguments to update one LevelUpPaper.
     * @example
     * // Update one LevelUpPaper
     * const levelUpPaper = await prisma.levelUpPaper.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends LevelUpPaperUpdateArgs>(args: SelectSubset<T, LevelUpPaperUpdateArgs<ExtArgs>>): Prisma__LevelUpPaperClient<$Result.GetResult<Prisma.$LevelUpPaperPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more LevelUpPapers.
     * @param {LevelUpPaperDeleteManyArgs} args - Arguments to filter LevelUpPapers to delete.
     * @example
     * // Delete a few LevelUpPapers
     * const { count } = await prisma.levelUpPaper.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends LevelUpPaperDeleteManyArgs>(args?: SelectSubset<T, LevelUpPaperDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more LevelUpPapers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPaperUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many LevelUpPapers
     * const levelUpPaper = await prisma.levelUpPaper.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends LevelUpPaperUpdateManyArgs>(args: SelectSubset<T, LevelUpPaperUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one LevelUpPaper.
     * @param {LevelUpPaperUpsertArgs} args - Arguments to update or create a LevelUpPaper.
     * @example
     * // Update or create a LevelUpPaper
     * const levelUpPaper = await prisma.levelUpPaper.upsert({
     *   create: {
     *     // ... data to create a LevelUpPaper
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the LevelUpPaper we want to update
     *   }
     * })
     */
    upsert<T extends LevelUpPaperUpsertArgs>(args: SelectSubset<T, LevelUpPaperUpsertArgs<ExtArgs>>): Prisma__LevelUpPaperClient<$Result.GetResult<Prisma.$LevelUpPaperPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of LevelUpPapers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPaperCountArgs} args - Arguments to filter LevelUpPapers to count.
     * @example
     * // Count the number of LevelUpPapers
     * const count = await prisma.levelUpPaper.count({
     *   where: {
     *     // ... the filter for the LevelUpPapers we want to count
     *   }
     * })
    **/
    count<T extends LevelUpPaperCountArgs>(
      args?: Subset<T, LevelUpPaperCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], LevelUpPaperCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a LevelUpPaper.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPaperAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends LevelUpPaperAggregateArgs>(args: Subset<T, LevelUpPaperAggregateArgs>): Prisma.PrismaPromise<GetLevelUpPaperAggregateType<T>>

    /**
     * Group by LevelUpPaper.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPaperGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends LevelUpPaperGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: LevelUpPaperGroupByArgs['orderBy'] }
        : { orderBy?: LevelUpPaperGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, LevelUpPaperGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLevelUpPaperGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the LevelUpPaper model
   */
  readonly fields: LevelUpPaperFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for LevelUpPaper.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__LevelUpPaperClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    subject<T extends LevelUpSubjectDefaultArgs<ExtArgs> = {}>(args?: Subset<T, LevelUpSubjectDefaultArgs<ExtArgs>>): Prisma__LevelUpSubjectClient<$Result.GetResult<Prisma.$LevelUpSubjectPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    questions<T extends LevelUpPaper$questionsArgs<ExtArgs> = {}>(args?: Subset<T, LevelUpPaper$questionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpPaperQuestionPayload<ExtArgs>, T, "findMany"> | Null>
    publishings<T extends LevelUpPaper$publishingsArgs<ExtArgs> = {}>(args?: Subset<T, LevelUpPaper$publishingsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpPublishingPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the LevelUpPaper model
   */ 
  interface LevelUpPaperFieldRefs {
    readonly id: FieldRef<"LevelUpPaper", 'String'>
    readonly title: FieldRef<"LevelUpPaper", 'String'>
    readonly subjectCode: FieldRef<"LevelUpPaper", 'String'>
    readonly classLevel: FieldRef<"LevelUpPaper", 'String'>
    readonly durationMinutes: FieldRef<"LevelUpPaper", 'Int'>
    readonly totalQuestions: FieldRef<"LevelUpPaper", 'Int'>
    readonly totalMarks: FieldRef<"LevelUpPaper", 'Int'>
    readonly status: FieldRef<"LevelUpPaper", 'String'>
    readonly createdAt: FieldRef<"LevelUpPaper", 'DateTime'>
    readonly updatedAt: FieldRef<"LevelUpPaper", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * LevelUpPaper findUnique
   */
  export type LevelUpPaperFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaper
     */
    select?: LevelUpPaperSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpPaper to fetch.
     */
    where: LevelUpPaperWhereUniqueInput
  }

  /**
   * LevelUpPaper findUniqueOrThrow
   */
  export type LevelUpPaperFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaper
     */
    select?: LevelUpPaperSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpPaper to fetch.
     */
    where: LevelUpPaperWhereUniqueInput
  }

  /**
   * LevelUpPaper findFirst
   */
  export type LevelUpPaperFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaper
     */
    select?: LevelUpPaperSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpPaper to fetch.
     */
    where?: LevelUpPaperWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpPapers to fetch.
     */
    orderBy?: LevelUpPaperOrderByWithRelationInput | LevelUpPaperOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LevelUpPapers.
     */
    cursor?: LevelUpPaperWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpPapers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpPapers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LevelUpPapers.
     */
    distinct?: LevelUpPaperScalarFieldEnum | LevelUpPaperScalarFieldEnum[]
  }

  /**
   * LevelUpPaper findFirstOrThrow
   */
  export type LevelUpPaperFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaper
     */
    select?: LevelUpPaperSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpPaper to fetch.
     */
    where?: LevelUpPaperWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpPapers to fetch.
     */
    orderBy?: LevelUpPaperOrderByWithRelationInput | LevelUpPaperOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LevelUpPapers.
     */
    cursor?: LevelUpPaperWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpPapers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpPapers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LevelUpPapers.
     */
    distinct?: LevelUpPaperScalarFieldEnum | LevelUpPaperScalarFieldEnum[]
  }

  /**
   * LevelUpPaper findMany
   */
  export type LevelUpPaperFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaper
     */
    select?: LevelUpPaperSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpPapers to fetch.
     */
    where?: LevelUpPaperWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpPapers to fetch.
     */
    orderBy?: LevelUpPaperOrderByWithRelationInput | LevelUpPaperOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing LevelUpPapers.
     */
    cursor?: LevelUpPaperWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpPapers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpPapers.
     */
    skip?: number
    distinct?: LevelUpPaperScalarFieldEnum | LevelUpPaperScalarFieldEnum[]
  }

  /**
   * LevelUpPaper create
   */
  export type LevelUpPaperCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaper
     */
    select?: LevelUpPaperSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperInclude<ExtArgs> | null
    /**
     * The data needed to create a LevelUpPaper.
     */
    data: XOR<LevelUpPaperCreateInput, LevelUpPaperUncheckedCreateInput>
  }

  /**
   * LevelUpPaper createMany
   */
  export type LevelUpPaperCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many LevelUpPapers.
     */
    data: LevelUpPaperCreateManyInput | LevelUpPaperCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * LevelUpPaper createManyAndReturn
   */
  export type LevelUpPaperCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaper
     */
    select?: LevelUpPaperSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many LevelUpPapers.
     */
    data: LevelUpPaperCreateManyInput | LevelUpPaperCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * LevelUpPaper update
   */
  export type LevelUpPaperUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaper
     */
    select?: LevelUpPaperSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperInclude<ExtArgs> | null
    /**
     * The data needed to update a LevelUpPaper.
     */
    data: XOR<LevelUpPaperUpdateInput, LevelUpPaperUncheckedUpdateInput>
    /**
     * Choose, which LevelUpPaper to update.
     */
    where: LevelUpPaperWhereUniqueInput
  }

  /**
   * LevelUpPaper updateMany
   */
  export type LevelUpPaperUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update LevelUpPapers.
     */
    data: XOR<LevelUpPaperUpdateManyMutationInput, LevelUpPaperUncheckedUpdateManyInput>
    /**
     * Filter which LevelUpPapers to update
     */
    where?: LevelUpPaperWhereInput
  }

  /**
   * LevelUpPaper upsert
   */
  export type LevelUpPaperUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaper
     */
    select?: LevelUpPaperSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperInclude<ExtArgs> | null
    /**
     * The filter to search for the LevelUpPaper to update in case it exists.
     */
    where: LevelUpPaperWhereUniqueInput
    /**
     * In case the LevelUpPaper found by the `where` argument doesn't exist, create a new LevelUpPaper with this data.
     */
    create: XOR<LevelUpPaperCreateInput, LevelUpPaperUncheckedCreateInput>
    /**
     * In case the LevelUpPaper was found with the provided `where` argument, update it with this data.
     */
    update: XOR<LevelUpPaperUpdateInput, LevelUpPaperUncheckedUpdateInput>
  }

  /**
   * LevelUpPaper delete
   */
  export type LevelUpPaperDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaper
     */
    select?: LevelUpPaperSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperInclude<ExtArgs> | null
    /**
     * Filter which LevelUpPaper to delete.
     */
    where: LevelUpPaperWhereUniqueInput
  }

  /**
   * LevelUpPaper deleteMany
   */
  export type LevelUpPaperDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LevelUpPapers to delete
     */
    where?: LevelUpPaperWhereInput
  }

  /**
   * LevelUpPaper.questions
   */
  export type LevelUpPaper$questionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaperQuestion
     */
    select?: LevelUpPaperQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperQuestionInclude<ExtArgs> | null
    where?: LevelUpPaperQuestionWhereInput
    orderBy?: LevelUpPaperQuestionOrderByWithRelationInput | LevelUpPaperQuestionOrderByWithRelationInput[]
    cursor?: LevelUpPaperQuestionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LevelUpPaperQuestionScalarFieldEnum | LevelUpPaperQuestionScalarFieldEnum[]
  }

  /**
   * LevelUpPaper.publishings
   */
  export type LevelUpPaper$publishingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPublishing
     */
    select?: LevelUpPublishingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPublishingInclude<ExtArgs> | null
    where?: LevelUpPublishingWhereInput
    orderBy?: LevelUpPublishingOrderByWithRelationInput | LevelUpPublishingOrderByWithRelationInput[]
    cursor?: LevelUpPublishingWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LevelUpPublishingScalarFieldEnum | LevelUpPublishingScalarFieldEnum[]
  }

  /**
   * LevelUpPaper without action
   */
  export type LevelUpPaperDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaper
     */
    select?: LevelUpPaperSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperInclude<ExtArgs> | null
  }


  /**
   * Model LevelUpPaperQuestion
   */

  export type AggregateLevelUpPaperQuestion = {
    _count: LevelUpPaperQuestionCountAggregateOutputType | null
    _avg: LevelUpPaperQuestionAvgAggregateOutputType | null
    _sum: LevelUpPaperQuestionSumAggregateOutputType | null
    _min: LevelUpPaperQuestionMinAggregateOutputType | null
    _max: LevelUpPaperQuestionMaxAggregateOutputType | null
  }

  export type LevelUpPaperQuestionAvgAggregateOutputType = {
    displayOrder: number | null
    marks: number | null
  }

  export type LevelUpPaperQuestionSumAggregateOutputType = {
    displayOrder: number | null
    marks: number | null
  }

  export type LevelUpPaperQuestionMinAggregateOutputType = {
    id: string | null
    paperId: string | null
    questionId: string | null
    displayOrder: number | null
    marks: number | null
  }

  export type LevelUpPaperQuestionMaxAggregateOutputType = {
    id: string | null
    paperId: string | null
    questionId: string | null
    displayOrder: number | null
    marks: number | null
  }

  export type LevelUpPaperQuestionCountAggregateOutputType = {
    id: number
    paperId: number
    questionId: number
    displayOrder: number
    marks: number
    _all: number
  }


  export type LevelUpPaperQuestionAvgAggregateInputType = {
    displayOrder?: true
    marks?: true
  }

  export type LevelUpPaperQuestionSumAggregateInputType = {
    displayOrder?: true
    marks?: true
  }

  export type LevelUpPaperQuestionMinAggregateInputType = {
    id?: true
    paperId?: true
    questionId?: true
    displayOrder?: true
    marks?: true
  }

  export type LevelUpPaperQuestionMaxAggregateInputType = {
    id?: true
    paperId?: true
    questionId?: true
    displayOrder?: true
    marks?: true
  }

  export type LevelUpPaperQuestionCountAggregateInputType = {
    id?: true
    paperId?: true
    questionId?: true
    displayOrder?: true
    marks?: true
    _all?: true
  }

  export type LevelUpPaperQuestionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LevelUpPaperQuestion to aggregate.
     */
    where?: LevelUpPaperQuestionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpPaperQuestions to fetch.
     */
    orderBy?: LevelUpPaperQuestionOrderByWithRelationInput | LevelUpPaperQuestionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: LevelUpPaperQuestionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpPaperQuestions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpPaperQuestions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned LevelUpPaperQuestions
    **/
    _count?: true | LevelUpPaperQuestionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: LevelUpPaperQuestionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: LevelUpPaperQuestionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: LevelUpPaperQuestionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: LevelUpPaperQuestionMaxAggregateInputType
  }

  export type GetLevelUpPaperQuestionAggregateType<T extends LevelUpPaperQuestionAggregateArgs> = {
        [P in keyof T & keyof AggregateLevelUpPaperQuestion]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLevelUpPaperQuestion[P]>
      : GetScalarType<T[P], AggregateLevelUpPaperQuestion[P]>
  }




  export type LevelUpPaperQuestionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LevelUpPaperQuestionWhereInput
    orderBy?: LevelUpPaperQuestionOrderByWithAggregationInput | LevelUpPaperQuestionOrderByWithAggregationInput[]
    by: LevelUpPaperQuestionScalarFieldEnum[] | LevelUpPaperQuestionScalarFieldEnum
    having?: LevelUpPaperQuestionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: LevelUpPaperQuestionCountAggregateInputType | true
    _avg?: LevelUpPaperQuestionAvgAggregateInputType
    _sum?: LevelUpPaperQuestionSumAggregateInputType
    _min?: LevelUpPaperQuestionMinAggregateInputType
    _max?: LevelUpPaperQuestionMaxAggregateInputType
  }

  export type LevelUpPaperQuestionGroupByOutputType = {
    id: string
    paperId: string
    questionId: string
    displayOrder: number
    marks: number
    _count: LevelUpPaperQuestionCountAggregateOutputType | null
    _avg: LevelUpPaperQuestionAvgAggregateOutputType | null
    _sum: LevelUpPaperQuestionSumAggregateOutputType | null
    _min: LevelUpPaperQuestionMinAggregateOutputType | null
    _max: LevelUpPaperQuestionMaxAggregateOutputType | null
  }

  type GetLevelUpPaperQuestionGroupByPayload<T extends LevelUpPaperQuestionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<LevelUpPaperQuestionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof LevelUpPaperQuestionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], LevelUpPaperQuestionGroupByOutputType[P]>
            : GetScalarType<T[P], LevelUpPaperQuestionGroupByOutputType[P]>
        }
      >
    >


  export type LevelUpPaperQuestionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    paperId?: boolean
    questionId?: boolean
    displayOrder?: boolean
    marks?: boolean
    paper?: boolean | LevelUpPaperDefaultArgs<ExtArgs>
    question?: boolean | LevelUpQuestionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["levelUpPaperQuestion"]>

  export type LevelUpPaperQuestionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    paperId?: boolean
    questionId?: boolean
    displayOrder?: boolean
    marks?: boolean
    paper?: boolean | LevelUpPaperDefaultArgs<ExtArgs>
    question?: boolean | LevelUpQuestionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["levelUpPaperQuestion"]>

  export type LevelUpPaperQuestionSelectScalar = {
    id?: boolean
    paperId?: boolean
    questionId?: boolean
    displayOrder?: boolean
    marks?: boolean
  }

  export type LevelUpPaperQuestionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    paper?: boolean | LevelUpPaperDefaultArgs<ExtArgs>
    question?: boolean | LevelUpQuestionDefaultArgs<ExtArgs>
  }
  export type LevelUpPaperQuestionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    paper?: boolean | LevelUpPaperDefaultArgs<ExtArgs>
    question?: boolean | LevelUpQuestionDefaultArgs<ExtArgs>
  }

  export type $LevelUpPaperQuestionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "LevelUpPaperQuestion"
    objects: {
      paper: Prisma.$LevelUpPaperPayload<ExtArgs>
      question: Prisma.$LevelUpQuestionPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      paperId: string
      questionId: string
      displayOrder: number
      marks: number
    }, ExtArgs["result"]["levelUpPaperQuestion"]>
    composites: {}
  }

  type LevelUpPaperQuestionGetPayload<S extends boolean | null | undefined | LevelUpPaperQuestionDefaultArgs> = $Result.GetResult<Prisma.$LevelUpPaperQuestionPayload, S>

  type LevelUpPaperQuestionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<LevelUpPaperQuestionFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: LevelUpPaperQuestionCountAggregateInputType | true
    }

  export interface LevelUpPaperQuestionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['LevelUpPaperQuestion'], meta: { name: 'LevelUpPaperQuestion' } }
    /**
     * Find zero or one LevelUpPaperQuestion that matches the filter.
     * @param {LevelUpPaperQuestionFindUniqueArgs} args - Arguments to find a LevelUpPaperQuestion
     * @example
     * // Get one LevelUpPaperQuestion
     * const levelUpPaperQuestion = await prisma.levelUpPaperQuestion.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends LevelUpPaperQuestionFindUniqueArgs>(args: SelectSubset<T, LevelUpPaperQuestionFindUniqueArgs<ExtArgs>>): Prisma__LevelUpPaperQuestionClient<$Result.GetResult<Prisma.$LevelUpPaperQuestionPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one LevelUpPaperQuestion that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {LevelUpPaperQuestionFindUniqueOrThrowArgs} args - Arguments to find a LevelUpPaperQuestion
     * @example
     * // Get one LevelUpPaperQuestion
     * const levelUpPaperQuestion = await prisma.levelUpPaperQuestion.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends LevelUpPaperQuestionFindUniqueOrThrowArgs>(args: SelectSubset<T, LevelUpPaperQuestionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__LevelUpPaperQuestionClient<$Result.GetResult<Prisma.$LevelUpPaperQuestionPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first LevelUpPaperQuestion that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPaperQuestionFindFirstArgs} args - Arguments to find a LevelUpPaperQuestion
     * @example
     * // Get one LevelUpPaperQuestion
     * const levelUpPaperQuestion = await prisma.levelUpPaperQuestion.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends LevelUpPaperQuestionFindFirstArgs>(args?: SelectSubset<T, LevelUpPaperQuestionFindFirstArgs<ExtArgs>>): Prisma__LevelUpPaperQuestionClient<$Result.GetResult<Prisma.$LevelUpPaperQuestionPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first LevelUpPaperQuestion that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPaperQuestionFindFirstOrThrowArgs} args - Arguments to find a LevelUpPaperQuestion
     * @example
     * // Get one LevelUpPaperQuestion
     * const levelUpPaperQuestion = await prisma.levelUpPaperQuestion.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends LevelUpPaperQuestionFindFirstOrThrowArgs>(args?: SelectSubset<T, LevelUpPaperQuestionFindFirstOrThrowArgs<ExtArgs>>): Prisma__LevelUpPaperQuestionClient<$Result.GetResult<Prisma.$LevelUpPaperQuestionPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more LevelUpPaperQuestions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPaperQuestionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all LevelUpPaperQuestions
     * const levelUpPaperQuestions = await prisma.levelUpPaperQuestion.findMany()
     * 
     * // Get first 10 LevelUpPaperQuestions
     * const levelUpPaperQuestions = await prisma.levelUpPaperQuestion.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const levelUpPaperQuestionWithIdOnly = await prisma.levelUpPaperQuestion.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends LevelUpPaperQuestionFindManyArgs>(args?: SelectSubset<T, LevelUpPaperQuestionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpPaperQuestionPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a LevelUpPaperQuestion.
     * @param {LevelUpPaperQuestionCreateArgs} args - Arguments to create a LevelUpPaperQuestion.
     * @example
     * // Create one LevelUpPaperQuestion
     * const LevelUpPaperQuestion = await prisma.levelUpPaperQuestion.create({
     *   data: {
     *     // ... data to create a LevelUpPaperQuestion
     *   }
     * })
     * 
     */
    create<T extends LevelUpPaperQuestionCreateArgs>(args: SelectSubset<T, LevelUpPaperQuestionCreateArgs<ExtArgs>>): Prisma__LevelUpPaperQuestionClient<$Result.GetResult<Prisma.$LevelUpPaperQuestionPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many LevelUpPaperQuestions.
     * @param {LevelUpPaperQuestionCreateManyArgs} args - Arguments to create many LevelUpPaperQuestions.
     * @example
     * // Create many LevelUpPaperQuestions
     * const levelUpPaperQuestion = await prisma.levelUpPaperQuestion.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends LevelUpPaperQuestionCreateManyArgs>(args?: SelectSubset<T, LevelUpPaperQuestionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many LevelUpPaperQuestions and returns the data saved in the database.
     * @param {LevelUpPaperQuestionCreateManyAndReturnArgs} args - Arguments to create many LevelUpPaperQuestions.
     * @example
     * // Create many LevelUpPaperQuestions
     * const levelUpPaperQuestion = await prisma.levelUpPaperQuestion.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many LevelUpPaperQuestions and only return the `id`
     * const levelUpPaperQuestionWithIdOnly = await prisma.levelUpPaperQuestion.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends LevelUpPaperQuestionCreateManyAndReturnArgs>(args?: SelectSubset<T, LevelUpPaperQuestionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpPaperQuestionPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a LevelUpPaperQuestion.
     * @param {LevelUpPaperQuestionDeleteArgs} args - Arguments to delete one LevelUpPaperQuestion.
     * @example
     * // Delete one LevelUpPaperQuestion
     * const LevelUpPaperQuestion = await prisma.levelUpPaperQuestion.delete({
     *   where: {
     *     // ... filter to delete one LevelUpPaperQuestion
     *   }
     * })
     * 
     */
    delete<T extends LevelUpPaperQuestionDeleteArgs>(args: SelectSubset<T, LevelUpPaperQuestionDeleteArgs<ExtArgs>>): Prisma__LevelUpPaperQuestionClient<$Result.GetResult<Prisma.$LevelUpPaperQuestionPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one LevelUpPaperQuestion.
     * @param {LevelUpPaperQuestionUpdateArgs} args - Arguments to update one LevelUpPaperQuestion.
     * @example
     * // Update one LevelUpPaperQuestion
     * const levelUpPaperQuestion = await prisma.levelUpPaperQuestion.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends LevelUpPaperQuestionUpdateArgs>(args: SelectSubset<T, LevelUpPaperQuestionUpdateArgs<ExtArgs>>): Prisma__LevelUpPaperQuestionClient<$Result.GetResult<Prisma.$LevelUpPaperQuestionPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more LevelUpPaperQuestions.
     * @param {LevelUpPaperQuestionDeleteManyArgs} args - Arguments to filter LevelUpPaperQuestions to delete.
     * @example
     * // Delete a few LevelUpPaperQuestions
     * const { count } = await prisma.levelUpPaperQuestion.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends LevelUpPaperQuestionDeleteManyArgs>(args?: SelectSubset<T, LevelUpPaperQuestionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more LevelUpPaperQuestions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPaperQuestionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many LevelUpPaperQuestions
     * const levelUpPaperQuestion = await prisma.levelUpPaperQuestion.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends LevelUpPaperQuestionUpdateManyArgs>(args: SelectSubset<T, LevelUpPaperQuestionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one LevelUpPaperQuestion.
     * @param {LevelUpPaperQuestionUpsertArgs} args - Arguments to update or create a LevelUpPaperQuestion.
     * @example
     * // Update or create a LevelUpPaperQuestion
     * const levelUpPaperQuestion = await prisma.levelUpPaperQuestion.upsert({
     *   create: {
     *     // ... data to create a LevelUpPaperQuestion
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the LevelUpPaperQuestion we want to update
     *   }
     * })
     */
    upsert<T extends LevelUpPaperQuestionUpsertArgs>(args: SelectSubset<T, LevelUpPaperQuestionUpsertArgs<ExtArgs>>): Prisma__LevelUpPaperQuestionClient<$Result.GetResult<Prisma.$LevelUpPaperQuestionPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of LevelUpPaperQuestions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPaperQuestionCountArgs} args - Arguments to filter LevelUpPaperQuestions to count.
     * @example
     * // Count the number of LevelUpPaperQuestions
     * const count = await prisma.levelUpPaperQuestion.count({
     *   where: {
     *     // ... the filter for the LevelUpPaperQuestions we want to count
     *   }
     * })
    **/
    count<T extends LevelUpPaperQuestionCountArgs>(
      args?: Subset<T, LevelUpPaperQuestionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], LevelUpPaperQuestionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a LevelUpPaperQuestion.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPaperQuestionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends LevelUpPaperQuestionAggregateArgs>(args: Subset<T, LevelUpPaperQuestionAggregateArgs>): Prisma.PrismaPromise<GetLevelUpPaperQuestionAggregateType<T>>

    /**
     * Group by LevelUpPaperQuestion.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPaperQuestionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends LevelUpPaperQuestionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: LevelUpPaperQuestionGroupByArgs['orderBy'] }
        : { orderBy?: LevelUpPaperQuestionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, LevelUpPaperQuestionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLevelUpPaperQuestionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the LevelUpPaperQuestion model
   */
  readonly fields: LevelUpPaperQuestionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for LevelUpPaperQuestion.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__LevelUpPaperQuestionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    paper<T extends LevelUpPaperDefaultArgs<ExtArgs> = {}>(args?: Subset<T, LevelUpPaperDefaultArgs<ExtArgs>>): Prisma__LevelUpPaperClient<$Result.GetResult<Prisma.$LevelUpPaperPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    question<T extends LevelUpQuestionDefaultArgs<ExtArgs> = {}>(args?: Subset<T, LevelUpQuestionDefaultArgs<ExtArgs>>): Prisma__LevelUpQuestionClient<$Result.GetResult<Prisma.$LevelUpQuestionPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the LevelUpPaperQuestion model
   */ 
  interface LevelUpPaperQuestionFieldRefs {
    readonly id: FieldRef<"LevelUpPaperQuestion", 'String'>
    readonly paperId: FieldRef<"LevelUpPaperQuestion", 'String'>
    readonly questionId: FieldRef<"LevelUpPaperQuestion", 'String'>
    readonly displayOrder: FieldRef<"LevelUpPaperQuestion", 'Int'>
    readonly marks: FieldRef<"LevelUpPaperQuestion", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * LevelUpPaperQuestion findUnique
   */
  export type LevelUpPaperQuestionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaperQuestion
     */
    select?: LevelUpPaperQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperQuestionInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpPaperQuestion to fetch.
     */
    where: LevelUpPaperQuestionWhereUniqueInput
  }

  /**
   * LevelUpPaperQuestion findUniqueOrThrow
   */
  export type LevelUpPaperQuestionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaperQuestion
     */
    select?: LevelUpPaperQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperQuestionInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpPaperQuestion to fetch.
     */
    where: LevelUpPaperQuestionWhereUniqueInput
  }

  /**
   * LevelUpPaperQuestion findFirst
   */
  export type LevelUpPaperQuestionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaperQuestion
     */
    select?: LevelUpPaperQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperQuestionInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpPaperQuestion to fetch.
     */
    where?: LevelUpPaperQuestionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpPaperQuestions to fetch.
     */
    orderBy?: LevelUpPaperQuestionOrderByWithRelationInput | LevelUpPaperQuestionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LevelUpPaperQuestions.
     */
    cursor?: LevelUpPaperQuestionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpPaperQuestions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpPaperQuestions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LevelUpPaperQuestions.
     */
    distinct?: LevelUpPaperQuestionScalarFieldEnum | LevelUpPaperQuestionScalarFieldEnum[]
  }

  /**
   * LevelUpPaperQuestion findFirstOrThrow
   */
  export type LevelUpPaperQuestionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaperQuestion
     */
    select?: LevelUpPaperQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperQuestionInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpPaperQuestion to fetch.
     */
    where?: LevelUpPaperQuestionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpPaperQuestions to fetch.
     */
    orderBy?: LevelUpPaperQuestionOrderByWithRelationInput | LevelUpPaperQuestionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LevelUpPaperQuestions.
     */
    cursor?: LevelUpPaperQuestionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpPaperQuestions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpPaperQuestions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LevelUpPaperQuestions.
     */
    distinct?: LevelUpPaperQuestionScalarFieldEnum | LevelUpPaperQuestionScalarFieldEnum[]
  }

  /**
   * LevelUpPaperQuestion findMany
   */
  export type LevelUpPaperQuestionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaperQuestion
     */
    select?: LevelUpPaperQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperQuestionInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpPaperQuestions to fetch.
     */
    where?: LevelUpPaperQuestionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpPaperQuestions to fetch.
     */
    orderBy?: LevelUpPaperQuestionOrderByWithRelationInput | LevelUpPaperQuestionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing LevelUpPaperQuestions.
     */
    cursor?: LevelUpPaperQuestionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpPaperQuestions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpPaperQuestions.
     */
    skip?: number
    distinct?: LevelUpPaperQuestionScalarFieldEnum | LevelUpPaperQuestionScalarFieldEnum[]
  }

  /**
   * LevelUpPaperQuestion create
   */
  export type LevelUpPaperQuestionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaperQuestion
     */
    select?: LevelUpPaperQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperQuestionInclude<ExtArgs> | null
    /**
     * The data needed to create a LevelUpPaperQuestion.
     */
    data: XOR<LevelUpPaperQuestionCreateInput, LevelUpPaperQuestionUncheckedCreateInput>
  }

  /**
   * LevelUpPaperQuestion createMany
   */
  export type LevelUpPaperQuestionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many LevelUpPaperQuestions.
     */
    data: LevelUpPaperQuestionCreateManyInput | LevelUpPaperQuestionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * LevelUpPaperQuestion createManyAndReturn
   */
  export type LevelUpPaperQuestionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaperQuestion
     */
    select?: LevelUpPaperQuestionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many LevelUpPaperQuestions.
     */
    data: LevelUpPaperQuestionCreateManyInput | LevelUpPaperQuestionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperQuestionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * LevelUpPaperQuestion update
   */
  export type LevelUpPaperQuestionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaperQuestion
     */
    select?: LevelUpPaperQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperQuestionInclude<ExtArgs> | null
    /**
     * The data needed to update a LevelUpPaperQuestion.
     */
    data: XOR<LevelUpPaperQuestionUpdateInput, LevelUpPaperQuestionUncheckedUpdateInput>
    /**
     * Choose, which LevelUpPaperQuestion to update.
     */
    where: LevelUpPaperQuestionWhereUniqueInput
  }

  /**
   * LevelUpPaperQuestion updateMany
   */
  export type LevelUpPaperQuestionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update LevelUpPaperQuestions.
     */
    data: XOR<LevelUpPaperQuestionUpdateManyMutationInput, LevelUpPaperQuestionUncheckedUpdateManyInput>
    /**
     * Filter which LevelUpPaperQuestions to update
     */
    where?: LevelUpPaperQuestionWhereInput
  }

  /**
   * LevelUpPaperQuestion upsert
   */
  export type LevelUpPaperQuestionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaperQuestion
     */
    select?: LevelUpPaperQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperQuestionInclude<ExtArgs> | null
    /**
     * The filter to search for the LevelUpPaperQuestion to update in case it exists.
     */
    where: LevelUpPaperQuestionWhereUniqueInput
    /**
     * In case the LevelUpPaperQuestion found by the `where` argument doesn't exist, create a new LevelUpPaperQuestion with this data.
     */
    create: XOR<LevelUpPaperQuestionCreateInput, LevelUpPaperQuestionUncheckedCreateInput>
    /**
     * In case the LevelUpPaperQuestion was found with the provided `where` argument, update it with this data.
     */
    update: XOR<LevelUpPaperQuestionUpdateInput, LevelUpPaperQuestionUncheckedUpdateInput>
  }

  /**
   * LevelUpPaperQuestion delete
   */
  export type LevelUpPaperQuestionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaperQuestion
     */
    select?: LevelUpPaperQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperQuestionInclude<ExtArgs> | null
    /**
     * Filter which LevelUpPaperQuestion to delete.
     */
    where: LevelUpPaperQuestionWhereUniqueInput
  }

  /**
   * LevelUpPaperQuestion deleteMany
   */
  export type LevelUpPaperQuestionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LevelUpPaperQuestions to delete
     */
    where?: LevelUpPaperQuestionWhereInput
  }

  /**
   * LevelUpPaperQuestion without action
   */
  export type LevelUpPaperQuestionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPaperQuestion
     */
    select?: LevelUpPaperQuestionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPaperQuestionInclude<ExtArgs> | null
  }


  /**
   * Model LevelUpPublishing
   */

  export type AggregateLevelUpPublishing = {
    _count: LevelUpPublishingCountAggregateOutputType | null
    _avg: LevelUpPublishingAvgAggregateOutputType | null
    _sum: LevelUpPublishingSumAggregateOutputType | null
    _min: LevelUpPublishingMinAggregateOutputType | null
    _max: LevelUpPublishingMaxAggregateOutputType | null
  }

  export type LevelUpPublishingAvgAggregateOutputType = {
    durationMinutes: number | null
  }

  export type LevelUpPublishingSumAggregateOutputType = {
    durationMinutes: number | null
  }

  export type LevelUpPublishingMinAggregateOutputType = {
    id: string | null
    slug: string | null
    title: string | null
    paperId: string | null
    classLevel: string | null
    subjectCode: string | null
    durationMinutes: number | null
    startAt: Date | null
    endAt: Date | null
    isActive: boolean | null
    createdAt: Date | null
  }

  export type LevelUpPublishingMaxAggregateOutputType = {
    id: string | null
    slug: string | null
    title: string | null
    paperId: string | null
    classLevel: string | null
    subjectCode: string | null
    durationMinutes: number | null
    startAt: Date | null
    endAt: Date | null
    isActive: boolean | null
    createdAt: Date | null
  }

  export type LevelUpPublishingCountAggregateOutputType = {
    id: number
    slug: number
    title: number
    paperId: number
    classLevel: number
    subjectCode: number
    durationMinutes: number
    startAt: number
    endAt: number
    isActive: number
    createdAt: number
    _all: number
  }


  export type LevelUpPublishingAvgAggregateInputType = {
    durationMinutes?: true
  }

  export type LevelUpPublishingSumAggregateInputType = {
    durationMinutes?: true
  }

  export type LevelUpPublishingMinAggregateInputType = {
    id?: true
    slug?: true
    title?: true
    paperId?: true
    classLevel?: true
    subjectCode?: true
    durationMinutes?: true
    startAt?: true
    endAt?: true
    isActive?: true
    createdAt?: true
  }

  export type LevelUpPublishingMaxAggregateInputType = {
    id?: true
    slug?: true
    title?: true
    paperId?: true
    classLevel?: true
    subjectCode?: true
    durationMinutes?: true
    startAt?: true
    endAt?: true
    isActive?: true
    createdAt?: true
  }

  export type LevelUpPublishingCountAggregateInputType = {
    id?: true
    slug?: true
    title?: true
    paperId?: true
    classLevel?: true
    subjectCode?: true
    durationMinutes?: true
    startAt?: true
    endAt?: true
    isActive?: true
    createdAt?: true
    _all?: true
  }

  export type LevelUpPublishingAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LevelUpPublishing to aggregate.
     */
    where?: LevelUpPublishingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpPublishings to fetch.
     */
    orderBy?: LevelUpPublishingOrderByWithRelationInput | LevelUpPublishingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: LevelUpPublishingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpPublishings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpPublishings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned LevelUpPublishings
    **/
    _count?: true | LevelUpPublishingCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: LevelUpPublishingAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: LevelUpPublishingSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: LevelUpPublishingMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: LevelUpPublishingMaxAggregateInputType
  }

  export type GetLevelUpPublishingAggregateType<T extends LevelUpPublishingAggregateArgs> = {
        [P in keyof T & keyof AggregateLevelUpPublishing]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLevelUpPublishing[P]>
      : GetScalarType<T[P], AggregateLevelUpPublishing[P]>
  }




  export type LevelUpPublishingGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LevelUpPublishingWhereInput
    orderBy?: LevelUpPublishingOrderByWithAggregationInput | LevelUpPublishingOrderByWithAggregationInput[]
    by: LevelUpPublishingScalarFieldEnum[] | LevelUpPublishingScalarFieldEnum
    having?: LevelUpPublishingScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: LevelUpPublishingCountAggregateInputType | true
    _avg?: LevelUpPublishingAvgAggregateInputType
    _sum?: LevelUpPublishingSumAggregateInputType
    _min?: LevelUpPublishingMinAggregateInputType
    _max?: LevelUpPublishingMaxAggregateInputType
  }

  export type LevelUpPublishingGroupByOutputType = {
    id: string
    slug: string
    title: string
    paperId: string
    classLevel: string
    subjectCode: string
    durationMinutes: number
    startAt: Date
    endAt: Date
    isActive: boolean
    createdAt: Date
    _count: LevelUpPublishingCountAggregateOutputType | null
    _avg: LevelUpPublishingAvgAggregateOutputType | null
    _sum: LevelUpPublishingSumAggregateOutputType | null
    _min: LevelUpPublishingMinAggregateOutputType | null
    _max: LevelUpPublishingMaxAggregateOutputType | null
  }

  type GetLevelUpPublishingGroupByPayload<T extends LevelUpPublishingGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<LevelUpPublishingGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof LevelUpPublishingGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], LevelUpPublishingGroupByOutputType[P]>
            : GetScalarType<T[P], LevelUpPublishingGroupByOutputType[P]>
        }
      >
    >


  export type LevelUpPublishingSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    title?: boolean
    paperId?: boolean
    classLevel?: boolean
    subjectCode?: boolean
    durationMinutes?: boolean
    startAt?: boolean
    endAt?: boolean
    isActive?: boolean
    createdAt?: boolean
    paper?: boolean | LevelUpPaperDefaultArgs<ExtArgs>
    subject?: boolean | LevelUpSubjectDefaultArgs<ExtArgs>
    attempts?: boolean | LevelUpPublishing$attemptsArgs<ExtArgs>
    _count?: boolean | LevelUpPublishingCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["levelUpPublishing"]>

  export type LevelUpPublishingSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    title?: boolean
    paperId?: boolean
    classLevel?: boolean
    subjectCode?: boolean
    durationMinutes?: boolean
    startAt?: boolean
    endAt?: boolean
    isActive?: boolean
    createdAt?: boolean
    paper?: boolean | LevelUpPaperDefaultArgs<ExtArgs>
    subject?: boolean | LevelUpSubjectDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["levelUpPublishing"]>

  export type LevelUpPublishingSelectScalar = {
    id?: boolean
    slug?: boolean
    title?: boolean
    paperId?: boolean
    classLevel?: boolean
    subjectCode?: boolean
    durationMinutes?: boolean
    startAt?: boolean
    endAt?: boolean
    isActive?: boolean
    createdAt?: boolean
  }

  export type LevelUpPublishingInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    paper?: boolean | LevelUpPaperDefaultArgs<ExtArgs>
    subject?: boolean | LevelUpSubjectDefaultArgs<ExtArgs>
    attempts?: boolean | LevelUpPublishing$attemptsArgs<ExtArgs>
    _count?: boolean | LevelUpPublishingCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type LevelUpPublishingIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    paper?: boolean | LevelUpPaperDefaultArgs<ExtArgs>
    subject?: boolean | LevelUpSubjectDefaultArgs<ExtArgs>
  }

  export type $LevelUpPublishingPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "LevelUpPublishing"
    objects: {
      paper: Prisma.$LevelUpPaperPayload<ExtArgs>
      subject: Prisma.$LevelUpSubjectPayload<ExtArgs>
      attempts: Prisma.$LevelUpAttemptPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      slug: string
      title: string
      paperId: string
      classLevel: string
      subjectCode: string
      durationMinutes: number
      startAt: Date
      endAt: Date
      isActive: boolean
      createdAt: Date
    }, ExtArgs["result"]["levelUpPublishing"]>
    composites: {}
  }

  type LevelUpPublishingGetPayload<S extends boolean | null | undefined | LevelUpPublishingDefaultArgs> = $Result.GetResult<Prisma.$LevelUpPublishingPayload, S>

  type LevelUpPublishingCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<LevelUpPublishingFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: LevelUpPublishingCountAggregateInputType | true
    }

  export interface LevelUpPublishingDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['LevelUpPublishing'], meta: { name: 'LevelUpPublishing' } }
    /**
     * Find zero or one LevelUpPublishing that matches the filter.
     * @param {LevelUpPublishingFindUniqueArgs} args - Arguments to find a LevelUpPublishing
     * @example
     * // Get one LevelUpPublishing
     * const levelUpPublishing = await prisma.levelUpPublishing.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends LevelUpPublishingFindUniqueArgs>(args: SelectSubset<T, LevelUpPublishingFindUniqueArgs<ExtArgs>>): Prisma__LevelUpPublishingClient<$Result.GetResult<Prisma.$LevelUpPublishingPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one LevelUpPublishing that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {LevelUpPublishingFindUniqueOrThrowArgs} args - Arguments to find a LevelUpPublishing
     * @example
     * // Get one LevelUpPublishing
     * const levelUpPublishing = await prisma.levelUpPublishing.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends LevelUpPublishingFindUniqueOrThrowArgs>(args: SelectSubset<T, LevelUpPublishingFindUniqueOrThrowArgs<ExtArgs>>): Prisma__LevelUpPublishingClient<$Result.GetResult<Prisma.$LevelUpPublishingPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first LevelUpPublishing that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPublishingFindFirstArgs} args - Arguments to find a LevelUpPublishing
     * @example
     * // Get one LevelUpPublishing
     * const levelUpPublishing = await prisma.levelUpPublishing.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends LevelUpPublishingFindFirstArgs>(args?: SelectSubset<T, LevelUpPublishingFindFirstArgs<ExtArgs>>): Prisma__LevelUpPublishingClient<$Result.GetResult<Prisma.$LevelUpPublishingPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first LevelUpPublishing that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPublishingFindFirstOrThrowArgs} args - Arguments to find a LevelUpPublishing
     * @example
     * // Get one LevelUpPublishing
     * const levelUpPublishing = await prisma.levelUpPublishing.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends LevelUpPublishingFindFirstOrThrowArgs>(args?: SelectSubset<T, LevelUpPublishingFindFirstOrThrowArgs<ExtArgs>>): Prisma__LevelUpPublishingClient<$Result.GetResult<Prisma.$LevelUpPublishingPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more LevelUpPublishings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPublishingFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all LevelUpPublishings
     * const levelUpPublishings = await prisma.levelUpPublishing.findMany()
     * 
     * // Get first 10 LevelUpPublishings
     * const levelUpPublishings = await prisma.levelUpPublishing.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const levelUpPublishingWithIdOnly = await prisma.levelUpPublishing.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends LevelUpPublishingFindManyArgs>(args?: SelectSubset<T, LevelUpPublishingFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpPublishingPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a LevelUpPublishing.
     * @param {LevelUpPublishingCreateArgs} args - Arguments to create a LevelUpPublishing.
     * @example
     * // Create one LevelUpPublishing
     * const LevelUpPublishing = await prisma.levelUpPublishing.create({
     *   data: {
     *     // ... data to create a LevelUpPublishing
     *   }
     * })
     * 
     */
    create<T extends LevelUpPublishingCreateArgs>(args: SelectSubset<T, LevelUpPublishingCreateArgs<ExtArgs>>): Prisma__LevelUpPublishingClient<$Result.GetResult<Prisma.$LevelUpPublishingPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many LevelUpPublishings.
     * @param {LevelUpPublishingCreateManyArgs} args - Arguments to create many LevelUpPublishings.
     * @example
     * // Create many LevelUpPublishings
     * const levelUpPublishing = await prisma.levelUpPublishing.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends LevelUpPublishingCreateManyArgs>(args?: SelectSubset<T, LevelUpPublishingCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many LevelUpPublishings and returns the data saved in the database.
     * @param {LevelUpPublishingCreateManyAndReturnArgs} args - Arguments to create many LevelUpPublishings.
     * @example
     * // Create many LevelUpPublishings
     * const levelUpPublishing = await prisma.levelUpPublishing.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many LevelUpPublishings and only return the `id`
     * const levelUpPublishingWithIdOnly = await prisma.levelUpPublishing.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends LevelUpPublishingCreateManyAndReturnArgs>(args?: SelectSubset<T, LevelUpPublishingCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpPublishingPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a LevelUpPublishing.
     * @param {LevelUpPublishingDeleteArgs} args - Arguments to delete one LevelUpPublishing.
     * @example
     * // Delete one LevelUpPublishing
     * const LevelUpPublishing = await prisma.levelUpPublishing.delete({
     *   where: {
     *     // ... filter to delete one LevelUpPublishing
     *   }
     * })
     * 
     */
    delete<T extends LevelUpPublishingDeleteArgs>(args: SelectSubset<T, LevelUpPublishingDeleteArgs<ExtArgs>>): Prisma__LevelUpPublishingClient<$Result.GetResult<Prisma.$LevelUpPublishingPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one LevelUpPublishing.
     * @param {LevelUpPublishingUpdateArgs} args - Arguments to update one LevelUpPublishing.
     * @example
     * // Update one LevelUpPublishing
     * const levelUpPublishing = await prisma.levelUpPublishing.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends LevelUpPublishingUpdateArgs>(args: SelectSubset<T, LevelUpPublishingUpdateArgs<ExtArgs>>): Prisma__LevelUpPublishingClient<$Result.GetResult<Prisma.$LevelUpPublishingPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more LevelUpPublishings.
     * @param {LevelUpPublishingDeleteManyArgs} args - Arguments to filter LevelUpPublishings to delete.
     * @example
     * // Delete a few LevelUpPublishings
     * const { count } = await prisma.levelUpPublishing.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends LevelUpPublishingDeleteManyArgs>(args?: SelectSubset<T, LevelUpPublishingDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more LevelUpPublishings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPublishingUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many LevelUpPublishings
     * const levelUpPublishing = await prisma.levelUpPublishing.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends LevelUpPublishingUpdateManyArgs>(args: SelectSubset<T, LevelUpPublishingUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one LevelUpPublishing.
     * @param {LevelUpPublishingUpsertArgs} args - Arguments to update or create a LevelUpPublishing.
     * @example
     * // Update or create a LevelUpPublishing
     * const levelUpPublishing = await prisma.levelUpPublishing.upsert({
     *   create: {
     *     // ... data to create a LevelUpPublishing
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the LevelUpPublishing we want to update
     *   }
     * })
     */
    upsert<T extends LevelUpPublishingUpsertArgs>(args: SelectSubset<T, LevelUpPublishingUpsertArgs<ExtArgs>>): Prisma__LevelUpPublishingClient<$Result.GetResult<Prisma.$LevelUpPublishingPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of LevelUpPublishings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPublishingCountArgs} args - Arguments to filter LevelUpPublishings to count.
     * @example
     * // Count the number of LevelUpPublishings
     * const count = await prisma.levelUpPublishing.count({
     *   where: {
     *     // ... the filter for the LevelUpPublishings we want to count
     *   }
     * })
    **/
    count<T extends LevelUpPublishingCountArgs>(
      args?: Subset<T, LevelUpPublishingCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], LevelUpPublishingCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a LevelUpPublishing.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPublishingAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends LevelUpPublishingAggregateArgs>(args: Subset<T, LevelUpPublishingAggregateArgs>): Prisma.PrismaPromise<GetLevelUpPublishingAggregateType<T>>

    /**
     * Group by LevelUpPublishing.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpPublishingGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends LevelUpPublishingGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: LevelUpPublishingGroupByArgs['orderBy'] }
        : { orderBy?: LevelUpPublishingGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, LevelUpPublishingGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLevelUpPublishingGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the LevelUpPublishing model
   */
  readonly fields: LevelUpPublishingFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for LevelUpPublishing.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__LevelUpPublishingClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    paper<T extends LevelUpPaperDefaultArgs<ExtArgs> = {}>(args?: Subset<T, LevelUpPaperDefaultArgs<ExtArgs>>): Prisma__LevelUpPaperClient<$Result.GetResult<Prisma.$LevelUpPaperPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    subject<T extends LevelUpSubjectDefaultArgs<ExtArgs> = {}>(args?: Subset<T, LevelUpSubjectDefaultArgs<ExtArgs>>): Prisma__LevelUpSubjectClient<$Result.GetResult<Prisma.$LevelUpSubjectPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    attempts<T extends LevelUpPublishing$attemptsArgs<ExtArgs> = {}>(args?: Subset<T, LevelUpPublishing$attemptsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpAttemptPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the LevelUpPublishing model
   */ 
  interface LevelUpPublishingFieldRefs {
    readonly id: FieldRef<"LevelUpPublishing", 'String'>
    readonly slug: FieldRef<"LevelUpPublishing", 'String'>
    readonly title: FieldRef<"LevelUpPublishing", 'String'>
    readonly paperId: FieldRef<"LevelUpPublishing", 'String'>
    readonly classLevel: FieldRef<"LevelUpPublishing", 'String'>
    readonly subjectCode: FieldRef<"LevelUpPublishing", 'String'>
    readonly durationMinutes: FieldRef<"LevelUpPublishing", 'Int'>
    readonly startAt: FieldRef<"LevelUpPublishing", 'DateTime'>
    readonly endAt: FieldRef<"LevelUpPublishing", 'DateTime'>
    readonly isActive: FieldRef<"LevelUpPublishing", 'Boolean'>
    readonly createdAt: FieldRef<"LevelUpPublishing", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * LevelUpPublishing findUnique
   */
  export type LevelUpPublishingFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPublishing
     */
    select?: LevelUpPublishingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPublishingInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpPublishing to fetch.
     */
    where: LevelUpPublishingWhereUniqueInput
  }

  /**
   * LevelUpPublishing findUniqueOrThrow
   */
  export type LevelUpPublishingFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPublishing
     */
    select?: LevelUpPublishingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPublishingInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpPublishing to fetch.
     */
    where: LevelUpPublishingWhereUniqueInput
  }

  /**
   * LevelUpPublishing findFirst
   */
  export type LevelUpPublishingFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPublishing
     */
    select?: LevelUpPublishingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPublishingInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpPublishing to fetch.
     */
    where?: LevelUpPublishingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpPublishings to fetch.
     */
    orderBy?: LevelUpPublishingOrderByWithRelationInput | LevelUpPublishingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LevelUpPublishings.
     */
    cursor?: LevelUpPublishingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpPublishings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpPublishings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LevelUpPublishings.
     */
    distinct?: LevelUpPublishingScalarFieldEnum | LevelUpPublishingScalarFieldEnum[]
  }

  /**
   * LevelUpPublishing findFirstOrThrow
   */
  export type LevelUpPublishingFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPublishing
     */
    select?: LevelUpPublishingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPublishingInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpPublishing to fetch.
     */
    where?: LevelUpPublishingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpPublishings to fetch.
     */
    orderBy?: LevelUpPublishingOrderByWithRelationInput | LevelUpPublishingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LevelUpPublishings.
     */
    cursor?: LevelUpPublishingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpPublishings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpPublishings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LevelUpPublishings.
     */
    distinct?: LevelUpPublishingScalarFieldEnum | LevelUpPublishingScalarFieldEnum[]
  }

  /**
   * LevelUpPublishing findMany
   */
  export type LevelUpPublishingFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPublishing
     */
    select?: LevelUpPublishingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPublishingInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpPublishings to fetch.
     */
    where?: LevelUpPublishingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpPublishings to fetch.
     */
    orderBy?: LevelUpPublishingOrderByWithRelationInput | LevelUpPublishingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing LevelUpPublishings.
     */
    cursor?: LevelUpPublishingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpPublishings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpPublishings.
     */
    skip?: number
    distinct?: LevelUpPublishingScalarFieldEnum | LevelUpPublishingScalarFieldEnum[]
  }

  /**
   * LevelUpPublishing create
   */
  export type LevelUpPublishingCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPublishing
     */
    select?: LevelUpPublishingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPublishingInclude<ExtArgs> | null
    /**
     * The data needed to create a LevelUpPublishing.
     */
    data: XOR<LevelUpPublishingCreateInput, LevelUpPublishingUncheckedCreateInput>
  }

  /**
   * LevelUpPublishing createMany
   */
  export type LevelUpPublishingCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many LevelUpPublishings.
     */
    data: LevelUpPublishingCreateManyInput | LevelUpPublishingCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * LevelUpPublishing createManyAndReturn
   */
  export type LevelUpPublishingCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPublishing
     */
    select?: LevelUpPublishingSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many LevelUpPublishings.
     */
    data: LevelUpPublishingCreateManyInput | LevelUpPublishingCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPublishingIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * LevelUpPublishing update
   */
  export type LevelUpPublishingUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPublishing
     */
    select?: LevelUpPublishingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPublishingInclude<ExtArgs> | null
    /**
     * The data needed to update a LevelUpPublishing.
     */
    data: XOR<LevelUpPublishingUpdateInput, LevelUpPublishingUncheckedUpdateInput>
    /**
     * Choose, which LevelUpPublishing to update.
     */
    where: LevelUpPublishingWhereUniqueInput
  }

  /**
   * LevelUpPublishing updateMany
   */
  export type LevelUpPublishingUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update LevelUpPublishings.
     */
    data: XOR<LevelUpPublishingUpdateManyMutationInput, LevelUpPublishingUncheckedUpdateManyInput>
    /**
     * Filter which LevelUpPublishings to update
     */
    where?: LevelUpPublishingWhereInput
  }

  /**
   * LevelUpPublishing upsert
   */
  export type LevelUpPublishingUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPublishing
     */
    select?: LevelUpPublishingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPublishingInclude<ExtArgs> | null
    /**
     * The filter to search for the LevelUpPublishing to update in case it exists.
     */
    where: LevelUpPublishingWhereUniqueInput
    /**
     * In case the LevelUpPublishing found by the `where` argument doesn't exist, create a new LevelUpPublishing with this data.
     */
    create: XOR<LevelUpPublishingCreateInput, LevelUpPublishingUncheckedCreateInput>
    /**
     * In case the LevelUpPublishing was found with the provided `where` argument, update it with this data.
     */
    update: XOR<LevelUpPublishingUpdateInput, LevelUpPublishingUncheckedUpdateInput>
  }

  /**
   * LevelUpPublishing delete
   */
  export type LevelUpPublishingDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPublishing
     */
    select?: LevelUpPublishingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPublishingInclude<ExtArgs> | null
    /**
     * Filter which LevelUpPublishing to delete.
     */
    where: LevelUpPublishingWhereUniqueInput
  }

  /**
   * LevelUpPublishing deleteMany
   */
  export type LevelUpPublishingDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LevelUpPublishings to delete
     */
    where?: LevelUpPublishingWhereInput
  }

  /**
   * LevelUpPublishing.attempts
   */
  export type LevelUpPublishing$attemptsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttempt
     */
    select?: LevelUpAttemptSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptInclude<ExtArgs> | null
    where?: LevelUpAttemptWhereInput
    orderBy?: LevelUpAttemptOrderByWithRelationInput | LevelUpAttemptOrderByWithRelationInput[]
    cursor?: LevelUpAttemptWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LevelUpAttemptScalarFieldEnum | LevelUpAttemptScalarFieldEnum[]
  }

  /**
   * LevelUpPublishing without action
   */
  export type LevelUpPublishingDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpPublishing
     */
    select?: LevelUpPublishingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpPublishingInclude<ExtArgs> | null
  }


  /**
   * Model LevelUpRegistration
   */

  export type AggregateLevelUpRegistration = {
    _count: LevelUpRegistrationCountAggregateOutputType | null
    _min: LevelUpRegistrationMinAggregateOutputType | null
    _max: LevelUpRegistrationMaxAggregateOutputType | null
  }

  export type LevelUpRegistrationMinAggregateOutputType = {
    id: string | null
    studentName: string | null
    email: string | null
    schoolName: string | null
    phone: string | null
    country: string | null
    emirateCity: string | null
    classLevel: string | null
    curriculum: string | null
    status: string | null
    attemptId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type LevelUpRegistrationMaxAggregateOutputType = {
    id: string | null
    studentName: string | null
    email: string | null
    schoolName: string | null
    phone: string | null
    country: string | null
    emirateCity: string | null
    classLevel: string | null
    curriculum: string | null
    status: string | null
    attemptId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type LevelUpRegistrationCountAggregateOutputType = {
    id: number
    studentName: number
    email: number
    schoolName: number
    phone: number
    country: number
    emirateCity: number
    classLevel: number
    curriculum: number
    status: number
    attemptId: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type LevelUpRegistrationMinAggregateInputType = {
    id?: true
    studentName?: true
    email?: true
    schoolName?: true
    phone?: true
    country?: true
    emirateCity?: true
    classLevel?: true
    curriculum?: true
    status?: true
    attemptId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type LevelUpRegistrationMaxAggregateInputType = {
    id?: true
    studentName?: true
    email?: true
    schoolName?: true
    phone?: true
    country?: true
    emirateCity?: true
    classLevel?: true
    curriculum?: true
    status?: true
    attemptId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type LevelUpRegistrationCountAggregateInputType = {
    id?: true
    studentName?: true
    email?: true
    schoolName?: true
    phone?: true
    country?: true
    emirateCity?: true
    classLevel?: true
    curriculum?: true
    status?: true
    attemptId?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type LevelUpRegistrationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LevelUpRegistration to aggregate.
     */
    where?: LevelUpRegistrationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpRegistrations to fetch.
     */
    orderBy?: LevelUpRegistrationOrderByWithRelationInput | LevelUpRegistrationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: LevelUpRegistrationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpRegistrations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpRegistrations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned LevelUpRegistrations
    **/
    _count?: true | LevelUpRegistrationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: LevelUpRegistrationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: LevelUpRegistrationMaxAggregateInputType
  }

  export type GetLevelUpRegistrationAggregateType<T extends LevelUpRegistrationAggregateArgs> = {
        [P in keyof T & keyof AggregateLevelUpRegistration]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLevelUpRegistration[P]>
      : GetScalarType<T[P], AggregateLevelUpRegistration[P]>
  }




  export type LevelUpRegistrationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LevelUpRegistrationWhereInput
    orderBy?: LevelUpRegistrationOrderByWithAggregationInput | LevelUpRegistrationOrderByWithAggregationInput[]
    by: LevelUpRegistrationScalarFieldEnum[] | LevelUpRegistrationScalarFieldEnum
    having?: LevelUpRegistrationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: LevelUpRegistrationCountAggregateInputType | true
    _min?: LevelUpRegistrationMinAggregateInputType
    _max?: LevelUpRegistrationMaxAggregateInputType
  }

  export type LevelUpRegistrationGroupByOutputType = {
    id: string
    studentName: string
    email: string | null
    schoolName: string | null
    phone: string
    country: string
    emirateCity: string | null
    classLevel: string
    curriculum: string | null
    status: string
    attemptId: string | null
    createdAt: Date
    updatedAt: Date
    _count: LevelUpRegistrationCountAggregateOutputType | null
    _min: LevelUpRegistrationMinAggregateOutputType | null
    _max: LevelUpRegistrationMaxAggregateOutputType | null
  }

  type GetLevelUpRegistrationGroupByPayload<T extends LevelUpRegistrationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<LevelUpRegistrationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof LevelUpRegistrationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], LevelUpRegistrationGroupByOutputType[P]>
            : GetScalarType<T[P], LevelUpRegistrationGroupByOutputType[P]>
        }
      >
    >


  export type LevelUpRegistrationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    studentName?: boolean
    email?: boolean
    schoolName?: boolean
    phone?: boolean
    country?: boolean
    emirateCity?: boolean
    classLevel?: boolean
    curriculum?: boolean
    status?: boolean
    attemptId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["levelUpRegistration"]>

  export type LevelUpRegistrationSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    studentName?: boolean
    email?: boolean
    schoolName?: boolean
    phone?: boolean
    country?: boolean
    emirateCity?: boolean
    classLevel?: boolean
    curriculum?: boolean
    status?: boolean
    attemptId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["levelUpRegistration"]>

  export type LevelUpRegistrationSelectScalar = {
    id?: boolean
    studentName?: boolean
    email?: boolean
    schoolName?: boolean
    phone?: boolean
    country?: boolean
    emirateCity?: boolean
    classLevel?: boolean
    curriculum?: boolean
    status?: boolean
    attemptId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }


  export type $LevelUpRegistrationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "LevelUpRegistration"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      studentName: string
      email: string | null
      schoolName: string | null
      phone: string
      country: string
      emirateCity: string | null
      classLevel: string
      curriculum: string | null
      status: string
      attemptId: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["levelUpRegistration"]>
    composites: {}
  }

  type LevelUpRegistrationGetPayload<S extends boolean | null | undefined | LevelUpRegistrationDefaultArgs> = $Result.GetResult<Prisma.$LevelUpRegistrationPayload, S>

  type LevelUpRegistrationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<LevelUpRegistrationFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: LevelUpRegistrationCountAggregateInputType | true
    }

  export interface LevelUpRegistrationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['LevelUpRegistration'], meta: { name: 'LevelUpRegistration' } }
    /**
     * Find zero or one LevelUpRegistration that matches the filter.
     * @param {LevelUpRegistrationFindUniqueArgs} args - Arguments to find a LevelUpRegistration
     * @example
     * // Get one LevelUpRegistration
     * const levelUpRegistration = await prisma.levelUpRegistration.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends LevelUpRegistrationFindUniqueArgs>(args: SelectSubset<T, LevelUpRegistrationFindUniqueArgs<ExtArgs>>): Prisma__LevelUpRegistrationClient<$Result.GetResult<Prisma.$LevelUpRegistrationPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one LevelUpRegistration that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {LevelUpRegistrationFindUniqueOrThrowArgs} args - Arguments to find a LevelUpRegistration
     * @example
     * // Get one LevelUpRegistration
     * const levelUpRegistration = await prisma.levelUpRegistration.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends LevelUpRegistrationFindUniqueOrThrowArgs>(args: SelectSubset<T, LevelUpRegistrationFindUniqueOrThrowArgs<ExtArgs>>): Prisma__LevelUpRegistrationClient<$Result.GetResult<Prisma.$LevelUpRegistrationPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first LevelUpRegistration that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpRegistrationFindFirstArgs} args - Arguments to find a LevelUpRegistration
     * @example
     * // Get one LevelUpRegistration
     * const levelUpRegistration = await prisma.levelUpRegistration.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends LevelUpRegistrationFindFirstArgs>(args?: SelectSubset<T, LevelUpRegistrationFindFirstArgs<ExtArgs>>): Prisma__LevelUpRegistrationClient<$Result.GetResult<Prisma.$LevelUpRegistrationPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first LevelUpRegistration that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpRegistrationFindFirstOrThrowArgs} args - Arguments to find a LevelUpRegistration
     * @example
     * // Get one LevelUpRegistration
     * const levelUpRegistration = await prisma.levelUpRegistration.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends LevelUpRegistrationFindFirstOrThrowArgs>(args?: SelectSubset<T, LevelUpRegistrationFindFirstOrThrowArgs<ExtArgs>>): Prisma__LevelUpRegistrationClient<$Result.GetResult<Prisma.$LevelUpRegistrationPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more LevelUpRegistrations that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpRegistrationFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all LevelUpRegistrations
     * const levelUpRegistrations = await prisma.levelUpRegistration.findMany()
     * 
     * // Get first 10 LevelUpRegistrations
     * const levelUpRegistrations = await prisma.levelUpRegistration.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const levelUpRegistrationWithIdOnly = await prisma.levelUpRegistration.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends LevelUpRegistrationFindManyArgs>(args?: SelectSubset<T, LevelUpRegistrationFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpRegistrationPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a LevelUpRegistration.
     * @param {LevelUpRegistrationCreateArgs} args - Arguments to create a LevelUpRegistration.
     * @example
     * // Create one LevelUpRegistration
     * const LevelUpRegistration = await prisma.levelUpRegistration.create({
     *   data: {
     *     // ... data to create a LevelUpRegistration
     *   }
     * })
     * 
     */
    create<T extends LevelUpRegistrationCreateArgs>(args: SelectSubset<T, LevelUpRegistrationCreateArgs<ExtArgs>>): Prisma__LevelUpRegistrationClient<$Result.GetResult<Prisma.$LevelUpRegistrationPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many LevelUpRegistrations.
     * @param {LevelUpRegistrationCreateManyArgs} args - Arguments to create many LevelUpRegistrations.
     * @example
     * // Create many LevelUpRegistrations
     * const levelUpRegistration = await prisma.levelUpRegistration.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends LevelUpRegistrationCreateManyArgs>(args?: SelectSubset<T, LevelUpRegistrationCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many LevelUpRegistrations and returns the data saved in the database.
     * @param {LevelUpRegistrationCreateManyAndReturnArgs} args - Arguments to create many LevelUpRegistrations.
     * @example
     * // Create many LevelUpRegistrations
     * const levelUpRegistration = await prisma.levelUpRegistration.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many LevelUpRegistrations and only return the `id`
     * const levelUpRegistrationWithIdOnly = await prisma.levelUpRegistration.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends LevelUpRegistrationCreateManyAndReturnArgs>(args?: SelectSubset<T, LevelUpRegistrationCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpRegistrationPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a LevelUpRegistration.
     * @param {LevelUpRegistrationDeleteArgs} args - Arguments to delete one LevelUpRegistration.
     * @example
     * // Delete one LevelUpRegistration
     * const LevelUpRegistration = await prisma.levelUpRegistration.delete({
     *   where: {
     *     // ... filter to delete one LevelUpRegistration
     *   }
     * })
     * 
     */
    delete<T extends LevelUpRegistrationDeleteArgs>(args: SelectSubset<T, LevelUpRegistrationDeleteArgs<ExtArgs>>): Prisma__LevelUpRegistrationClient<$Result.GetResult<Prisma.$LevelUpRegistrationPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one LevelUpRegistration.
     * @param {LevelUpRegistrationUpdateArgs} args - Arguments to update one LevelUpRegistration.
     * @example
     * // Update one LevelUpRegistration
     * const levelUpRegistration = await prisma.levelUpRegistration.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends LevelUpRegistrationUpdateArgs>(args: SelectSubset<T, LevelUpRegistrationUpdateArgs<ExtArgs>>): Prisma__LevelUpRegistrationClient<$Result.GetResult<Prisma.$LevelUpRegistrationPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more LevelUpRegistrations.
     * @param {LevelUpRegistrationDeleteManyArgs} args - Arguments to filter LevelUpRegistrations to delete.
     * @example
     * // Delete a few LevelUpRegistrations
     * const { count } = await prisma.levelUpRegistration.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends LevelUpRegistrationDeleteManyArgs>(args?: SelectSubset<T, LevelUpRegistrationDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more LevelUpRegistrations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpRegistrationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many LevelUpRegistrations
     * const levelUpRegistration = await prisma.levelUpRegistration.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends LevelUpRegistrationUpdateManyArgs>(args: SelectSubset<T, LevelUpRegistrationUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one LevelUpRegistration.
     * @param {LevelUpRegistrationUpsertArgs} args - Arguments to update or create a LevelUpRegistration.
     * @example
     * // Update or create a LevelUpRegistration
     * const levelUpRegistration = await prisma.levelUpRegistration.upsert({
     *   create: {
     *     // ... data to create a LevelUpRegistration
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the LevelUpRegistration we want to update
     *   }
     * })
     */
    upsert<T extends LevelUpRegistrationUpsertArgs>(args: SelectSubset<T, LevelUpRegistrationUpsertArgs<ExtArgs>>): Prisma__LevelUpRegistrationClient<$Result.GetResult<Prisma.$LevelUpRegistrationPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of LevelUpRegistrations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpRegistrationCountArgs} args - Arguments to filter LevelUpRegistrations to count.
     * @example
     * // Count the number of LevelUpRegistrations
     * const count = await prisma.levelUpRegistration.count({
     *   where: {
     *     // ... the filter for the LevelUpRegistrations we want to count
     *   }
     * })
    **/
    count<T extends LevelUpRegistrationCountArgs>(
      args?: Subset<T, LevelUpRegistrationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], LevelUpRegistrationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a LevelUpRegistration.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpRegistrationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends LevelUpRegistrationAggregateArgs>(args: Subset<T, LevelUpRegistrationAggregateArgs>): Prisma.PrismaPromise<GetLevelUpRegistrationAggregateType<T>>

    /**
     * Group by LevelUpRegistration.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpRegistrationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends LevelUpRegistrationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: LevelUpRegistrationGroupByArgs['orderBy'] }
        : { orderBy?: LevelUpRegistrationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, LevelUpRegistrationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLevelUpRegistrationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the LevelUpRegistration model
   */
  readonly fields: LevelUpRegistrationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for LevelUpRegistration.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__LevelUpRegistrationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the LevelUpRegistration model
   */ 
  interface LevelUpRegistrationFieldRefs {
    readonly id: FieldRef<"LevelUpRegistration", 'String'>
    readonly studentName: FieldRef<"LevelUpRegistration", 'String'>
    readonly email: FieldRef<"LevelUpRegistration", 'String'>
    readonly schoolName: FieldRef<"LevelUpRegistration", 'String'>
    readonly phone: FieldRef<"LevelUpRegistration", 'String'>
    readonly country: FieldRef<"LevelUpRegistration", 'String'>
    readonly emirateCity: FieldRef<"LevelUpRegistration", 'String'>
    readonly classLevel: FieldRef<"LevelUpRegistration", 'String'>
    readonly curriculum: FieldRef<"LevelUpRegistration", 'String'>
    readonly status: FieldRef<"LevelUpRegistration", 'String'>
    readonly attemptId: FieldRef<"LevelUpRegistration", 'String'>
    readonly createdAt: FieldRef<"LevelUpRegistration", 'DateTime'>
    readonly updatedAt: FieldRef<"LevelUpRegistration", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * LevelUpRegistration findUnique
   */
  export type LevelUpRegistrationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpRegistration
     */
    select?: LevelUpRegistrationSelect<ExtArgs> | null
    /**
     * Filter, which LevelUpRegistration to fetch.
     */
    where: LevelUpRegistrationWhereUniqueInput
  }

  /**
   * LevelUpRegistration findUniqueOrThrow
   */
  export type LevelUpRegistrationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpRegistration
     */
    select?: LevelUpRegistrationSelect<ExtArgs> | null
    /**
     * Filter, which LevelUpRegistration to fetch.
     */
    where: LevelUpRegistrationWhereUniqueInput
  }

  /**
   * LevelUpRegistration findFirst
   */
  export type LevelUpRegistrationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpRegistration
     */
    select?: LevelUpRegistrationSelect<ExtArgs> | null
    /**
     * Filter, which LevelUpRegistration to fetch.
     */
    where?: LevelUpRegistrationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpRegistrations to fetch.
     */
    orderBy?: LevelUpRegistrationOrderByWithRelationInput | LevelUpRegistrationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LevelUpRegistrations.
     */
    cursor?: LevelUpRegistrationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpRegistrations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpRegistrations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LevelUpRegistrations.
     */
    distinct?: LevelUpRegistrationScalarFieldEnum | LevelUpRegistrationScalarFieldEnum[]
  }

  /**
   * LevelUpRegistration findFirstOrThrow
   */
  export type LevelUpRegistrationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpRegistration
     */
    select?: LevelUpRegistrationSelect<ExtArgs> | null
    /**
     * Filter, which LevelUpRegistration to fetch.
     */
    where?: LevelUpRegistrationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpRegistrations to fetch.
     */
    orderBy?: LevelUpRegistrationOrderByWithRelationInput | LevelUpRegistrationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LevelUpRegistrations.
     */
    cursor?: LevelUpRegistrationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpRegistrations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpRegistrations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LevelUpRegistrations.
     */
    distinct?: LevelUpRegistrationScalarFieldEnum | LevelUpRegistrationScalarFieldEnum[]
  }

  /**
   * LevelUpRegistration findMany
   */
  export type LevelUpRegistrationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpRegistration
     */
    select?: LevelUpRegistrationSelect<ExtArgs> | null
    /**
     * Filter, which LevelUpRegistrations to fetch.
     */
    where?: LevelUpRegistrationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpRegistrations to fetch.
     */
    orderBy?: LevelUpRegistrationOrderByWithRelationInput | LevelUpRegistrationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing LevelUpRegistrations.
     */
    cursor?: LevelUpRegistrationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpRegistrations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpRegistrations.
     */
    skip?: number
    distinct?: LevelUpRegistrationScalarFieldEnum | LevelUpRegistrationScalarFieldEnum[]
  }

  /**
   * LevelUpRegistration create
   */
  export type LevelUpRegistrationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpRegistration
     */
    select?: LevelUpRegistrationSelect<ExtArgs> | null
    /**
     * The data needed to create a LevelUpRegistration.
     */
    data: XOR<LevelUpRegistrationCreateInput, LevelUpRegistrationUncheckedCreateInput>
  }

  /**
   * LevelUpRegistration createMany
   */
  export type LevelUpRegistrationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many LevelUpRegistrations.
     */
    data: LevelUpRegistrationCreateManyInput | LevelUpRegistrationCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * LevelUpRegistration createManyAndReturn
   */
  export type LevelUpRegistrationCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpRegistration
     */
    select?: LevelUpRegistrationSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many LevelUpRegistrations.
     */
    data: LevelUpRegistrationCreateManyInput | LevelUpRegistrationCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * LevelUpRegistration update
   */
  export type LevelUpRegistrationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpRegistration
     */
    select?: LevelUpRegistrationSelect<ExtArgs> | null
    /**
     * The data needed to update a LevelUpRegistration.
     */
    data: XOR<LevelUpRegistrationUpdateInput, LevelUpRegistrationUncheckedUpdateInput>
    /**
     * Choose, which LevelUpRegistration to update.
     */
    where: LevelUpRegistrationWhereUniqueInput
  }

  /**
   * LevelUpRegistration updateMany
   */
  export type LevelUpRegistrationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update LevelUpRegistrations.
     */
    data: XOR<LevelUpRegistrationUpdateManyMutationInput, LevelUpRegistrationUncheckedUpdateManyInput>
    /**
     * Filter which LevelUpRegistrations to update
     */
    where?: LevelUpRegistrationWhereInput
  }

  /**
   * LevelUpRegistration upsert
   */
  export type LevelUpRegistrationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpRegistration
     */
    select?: LevelUpRegistrationSelect<ExtArgs> | null
    /**
     * The filter to search for the LevelUpRegistration to update in case it exists.
     */
    where: LevelUpRegistrationWhereUniqueInput
    /**
     * In case the LevelUpRegistration found by the `where` argument doesn't exist, create a new LevelUpRegistration with this data.
     */
    create: XOR<LevelUpRegistrationCreateInput, LevelUpRegistrationUncheckedCreateInput>
    /**
     * In case the LevelUpRegistration was found with the provided `where` argument, update it with this data.
     */
    update: XOR<LevelUpRegistrationUpdateInput, LevelUpRegistrationUncheckedUpdateInput>
  }

  /**
   * LevelUpRegistration delete
   */
  export type LevelUpRegistrationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpRegistration
     */
    select?: LevelUpRegistrationSelect<ExtArgs> | null
    /**
     * Filter which LevelUpRegistration to delete.
     */
    where: LevelUpRegistrationWhereUniqueInput
  }

  /**
   * LevelUpRegistration deleteMany
   */
  export type LevelUpRegistrationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LevelUpRegistrations to delete
     */
    where?: LevelUpRegistrationWhereInput
  }

  /**
   * LevelUpRegistration without action
   */
  export type LevelUpRegistrationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpRegistration
     */
    select?: LevelUpRegistrationSelect<ExtArgs> | null
  }


  /**
   * Model LevelUpAttempt
   */

  export type AggregateLevelUpAttempt = {
    _count: LevelUpAttemptCountAggregateOutputType | null
    _avg: LevelUpAttemptAvgAggregateOutputType | null
    _sum: LevelUpAttemptSumAggregateOutputType | null
    _min: LevelUpAttemptMinAggregateOutputType | null
    _max: LevelUpAttemptMaxAggregateOutputType | null
  }

  export type LevelUpAttemptAvgAggregateOutputType = {
    scoreObtained: number | null
    totalMarks: number | null
    percentage: number | null
    correctCount: number | null
    wrongCount: number | null
    unansweredCount: number | null
  }

  export type LevelUpAttemptSumAggregateOutputType = {
    scoreObtained: number | null
    totalMarks: number | null
    percentage: number | null
    correctCount: number | null
    wrongCount: number | null
    unansweredCount: number | null
  }

  export type LevelUpAttemptMinAggregateOutputType = {
    id: string | null
    publishingId: string | null
    studentName: string | null
    email: string | null
    schoolName: string | null
    studentPhone: string | null
    country: string | null
    emirateCity: string | null
    classLevel: string | null
    curriculum: string | null
    status: string | null
    startedAt: Date | null
    submittedAt: Date | null
    scoreObtained: number | null
    totalMarks: number | null
    percentage: number | null
    correctCount: number | null
    wrongCount: number | null
    unansweredCount: number | null
    sessionTokenHash: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type LevelUpAttemptMaxAggregateOutputType = {
    id: string | null
    publishingId: string | null
    studentName: string | null
    email: string | null
    schoolName: string | null
    studentPhone: string | null
    country: string | null
    emirateCity: string | null
    classLevel: string | null
    curriculum: string | null
    status: string | null
    startedAt: Date | null
    submittedAt: Date | null
    scoreObtained: number | null
    totalMarks: number | null
    percentage: number | null
    correctCount: number | null
    wrongCount: number | null
    unansweredCount: number | null
    sessionTokenHash: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type LevelUpAttemptCountAggregateOutputType = {
    id: number
    publishingId: number
    studentName: number
    email: number
    schoolName: number
    studentPhone: number
    country: number
    emirateCity: number
    classLevel: number
    curriculum: number
    status: number
    startedAt: number
    submittedAt: number
    scoreObtained: number
    totalMarks: number
    percentage: number
    correctCount: number
    wrongCount: number
    unansweredCount: number
    paperSnapshotJson: number
    resultSnapshotJson: number
    sessionTokenHash: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type LevelUpAttemptAvgAggregateInputType = {
    scoreObtained?: true
    totalMarks?: true
    percentage?: true
    correctCount?: true
    wrongCount?: true
    unansweredCount?: true
  }

  export type LevelUpAttemptSumAggregateInputType = {
    scoreObtained?: true
    totalMarks?: true
    percentage?: true
    correctCount?: true
    wrongCount?: true
    unansweredCount?: true
  }

  export type LevelUpAttemptMinAggregateInputType = {
    id?: true
    publishingId?: true
    studentName?: true
    email?: true
    schoolName?: true
    studentPhone?: true
    country?: true
    emirateCity?: true
    classLevel?: true
    curriculum?: true
    status?: true
    startedAt?: true
    submittedAt?: true
    scoreObtained?: true
    totalMarks?: true
    percentage?: true
    correctCount?: true
    wrongCount?: true
    unansweredCount?: true
    sessionTokenHash?: true
    createdAt?: true
    updatedAt?: true
  }

  export type LevelUpAttemptMaxAggregateInputType = {
    id?: true
    publishingId?: true
    studentName?: true
    email?: true
    schoolName?: true
    studentPhone?: true
    country?: true
    emirateCity?: true
    classLevel?: true
    curriculum?: true
    status?: true
    startedAt?: true
    submittedAt?: true
    scoreObtained?: true
    totalMarks?: true
    percentage?: true
    correctCount?: true
    wrongCount?: true
    unansweredCount?: true
    sessionTokenHash?: true
    createdAt?: true
    updatedAt?: true
  }

  export type LevelUpAttemptCountAggregateInputType = {
    id?: true
    publishingId?: true
    studentName?: true
    email?: true
    schoolName?: true
    studentPhone?: true
    country?: true
    emirateCity?: true
    classLevel?: true
    curriculum?: true
    status?: true
    startedAt?: true
    submittedAt?: true
    scoreObtained?: true
    totalMarks?: true
    percentage?: true
    correctCount?: true
    wrongCount?: true
    unansweredCount?: true
    paperSnapshotJson?: true
    resultSnapshotJson?: true
    sessionTokenHash?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type LevelUpAttemptAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LevelUpAttempt to aggregate.
     */
    where?: LevelUpAttemptWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpAttempts to fetch.
     */
    orderBy?: LevelUpAttemptOrderByWithRelationInput | LevelUpAttemptOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: LevelUpAttemptWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpAttempts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpAttempts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned LevelUpAttempts
    **/
    _count?: true | LevelUpAttemptCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: LevelUpAttemptAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: LevelUpAttemptSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: LevelUpAttemptMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: LevelUpAttemptMaxAggregateInputType
  }

  export type GetLevelUpAttemptAggregateType<T extends LevelUpAttemptAggregateArgs> = {
        [P in keyof T & keyof AggregateLevelUpAttempt]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLevelUpAttempt[P]>
      : GetScalarType<T[P], AggregateLevelUpAttempt[P]>
  }




  export type LevelUpAttemptGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LevelUpAttemptWhereInput
    orderBy?: LevelUpAttemptOrderByWithAggregationInput | LevelUpAttemptOrderByWithAggregationInput[]
    by: LevelUpAttemptScalarFieldEnum[] | LevelUpAttemptScalarFieldEnum
    having?: LevelUpAttemptScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: LevelUpAttemptCountAggregateInputType | true
    _avg?: LevelUpAttemptAvgAggregateInputType
    _sum?: LevelUpAttemptSumAggregateInputType
    _min?: LevelUpAttemptMinAggregateInputType
    _max?: LevelUpAttemptMaxAggregateInputType
  }

  export type LevelUpAttemptGroupByOutputType = {
    id: string
    publishingId: string
    studentName: string
    email: string | null
    schoolName: string | null
    studentPhone: string | null
    country: string | null
    emirateCity: string | null
    classLevel: string
    curriculum: string | null
    status: string
    startedAt: Date
    submittedAt: Date | null
    scoreObtained: number
    totalMarks: number
    percentage: number
    correctCount: number
    wrongCount: number
    unansweredCount: number
    paperSnapshotJson: JsonValue
    resultSnapshotJson: JsonValue | null
    sessionTokenHash: string
    createdAt: Date
    updatedAt: Date
    _count: LevelUpAttemptCountAggregateOutputType | null
    _avg: LevelUpAttemptAvgAggregateOutputType | null
    _sum: LevelUpAttemptSumAggregateOutputType | null
    _min: LevelUpAttemptMinAggregateOutputType | null
    _max: LevelUpAttemptMaxAggregateOutputType | null
  }

  type GetLevelUpAttemptGroupByPayload<T extends LevelUpAttemptGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<LevelUpAttemptGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof LevelUpAttemptGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], LevelUpAttemptGroupByOutputType[P]>
            : GetScalarType<T[P], LevelUpAttemptGroupByOutputType[P]>
        }
      >
    >


  export type LevelUpAttemptSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    publishingId?: boolean
    studentName?: boolean
    email?: boolean
    schoolName?: boolean
    studentPhone?: boolean
    country?: boolean
    emirateCity?: boolean
    classLevel?: boolean
    curriculum?: boolean
    status?: boolean
    startedAt?: boolean
    submittedAt?: boolean
    scoreObtained?: boolean
    totalMarks?: boolean
    percentage?: boolean
    correctCount?: boolean
    wrongCount?: boolean
    unansweredCount?: boolean
    paperSnapshotJson?: boolean
    resultSnapshotJson?: boolean
    sessionTokenHash?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    publishing?: boolean | LevelUpPublishingDefaultArgs<ExtArgs>
    answers?: boolean | LevelUpAttempt$answersArgs<ExtArgs>
    _count?: boolean | LevelUpAttemptCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["levelUpAttempt"]>

  export type LevelUpAttemptSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    publishingId?: boolean
    studentName?: boolean
    email?: boolean
    schoolName?: boolean
    studentPhone?: boolean
    country?: boolean
    emirateCity?: boolean
    classLevel?: boolean
    curriculum?: boolean
    status?: boolean
    startedAt?: boolean
    submittedAt?: boolean
    scoreObtained?: boolean
    totalMarks?: boolean
    percentage?: boolean
    correctCount?: boolean
    wrongCount?: boolean
    unansweredCount?: boolean
    paperSnapshotJson?: boolean
    resultSnapshotJson?: boolean
    sessionTokenHash?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    publishing?: boolean | LevelUpPublishingDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["levelUpAttempt"]>

  export type LevelUpAttemptSelectScalar = {
    id?: boolean
    publishingId?: boolean
    studentName?: boolean
    email?: boolean
    schoolName?: boolean
    studentPhone?: boolean
    country?: boolean
    emirateCity?: boolean
    classLevel?: boolean
    curriculum?: boolean
    status?: boolean
    startedAt?: boolean
    submittedAt?: boolean
    scoreObtained?: boolean
    totalMarks?: boolean
    percentage?: boolean
    correctCount?: boolean
    wrongCount?: boolean
    unansweredCount?: boolean
    paperSnapshotJson?: boolean
    resultSnapshotJson?: boolean
    sessionTokenHash?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type LevelUpAttemptInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    publishing?: boolean | LevelUpPublishingDefaultArgs<ExtArgs>
    answers?: boolean | LevelUpAttempt$answersArgs<ExtArgs>
    _count?: boolean | LevelUpAttemptCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type LevelUpAttemptIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    publishing?: boolean | LevelUpPublishingDefaultArgs<ExtArgs>
  }

  export type $LevelUpAttemptPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "LevelUpAttempt"
    objects: {
      publishing: Prisma.$LevelUpPublishingPayload<ExtArgs>
      answers: Prisma.$LevelUpAttemptAnswerPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      publishingId: string
      studentName: string
      email: string | null
      schoolName: string | null
      studentPhone: string | null
      country: string | null
      emirateCity: string | null
      classLevel: string
      curriculum: string | null
      status: string
      startedAt: Date
      submittedAt: Date | null
      scoreObtained: number
      totalMarks: number
      percentage: number
      correctCount: number
      wrongCount: number
      unansweredCount: number
      paperSnapshotJson: Prisma.JsonValue
      resultSnapshotJson: Prisma.JsonValue | null
      sessionTokenHash: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["levelUpAttempt"]>
    composites: {}
  }

  type LevelUpAttemptGetPayload<S extends boolean | null | undefined | LevelUpAttemptDefaultArgs> = $Result.GetResult<Prisma.$LevelUpAttemptPayload, S>

  type LevelUpAttemptCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<LevelUpAttemptFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: LevelUpAttemptCountAggregateInputType | true
    }

  export interface LevelUpAttemptDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['LevelUpAttempt'], meta: { name: 'LevelUpAttempt' } }
    /**
     * Find zero or one LevelUpAttempt that matches the filter.
     * @param {LevelUpAttemptFindUniqueArgs} args - Arguments to find a LevelUpAttempt
     * @example
     * // Get one LevelUpAttempt
     * const levelUpAttempt = await prisma.levelUpAttempt.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends LevelUpAttemptFindUniqueArgs>(args: SelectSubset<T, LevelUpAttemptFindUniqueArgs<ExtArgs>>): Prisma__LevelUpAttemptClient<$Result.GetResult<Prisma.$LevelUpAttemptPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one LevelUpAttempt that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {LevelUpAttemptFindUniqueOrThrowArgs} args - Arguments to find a LevelUpAttempt
     * @example
     * // Get one LevelUpAttempt
     * const levelUpAttempt = await prisma.levelUpAttempt.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends LevelUpAttemptFindUniqueOrThrowArgs>(args: SelectSubset<T, LevelUpAttemptFindUniqueOrThrowArgs<ExtArgs>>): Prisma__LevelUpAttemptClient<$Result.GetResult<Prisma.$LevelUpAttemptPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first LevelUpAttempt that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpAttemptFindFirstArgs} args - Arguments to find a LevelUpAttempt
     * @example
     * // Get one LevelUpAttempt
     * const levelUpAttempt = await prisma.levelUpAttempt.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends LevelUpAttemptFindFirstArgs>(args?: SelectSubset<T, LevelUpAttemptFindFirstArgs<ExtArgs>>): Prisma__LevelUpAttemptClient<$Result.GetResult<Prisma.$LevelUpAttemptPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first LevelUpAttempt that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpAttemptFindFirstOrThrowArgs} args - Arguments to find a LevelUpAttempt
     * @example
     * // Get one LevelUpAttempt
     * const levelUpAttempt = await prisma.levelUpAttempt.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends LevelUpAttemptFindFirstOrThrowArgs>(args?: SelectSubset<T, LevelUpAttemptFindFirstOrThrowArgs<ExtArgs>>): Prisma__LevelUpAttemptClient<$Result.GetResult<Prisma.$LevelUpAttemptPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more LevelUpAttempts that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpAttemptFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all LevelUpAttempts
     * const levelUpAttempts = await prisma.levelUpAttempt.findMany()
     * 
     * // Get first 10 LevelUpAttempts
     * const levelUpAttempts = await prisma.levelUpAttempt.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const levelUpAttemptWithIdOnly = await prisma.levelUpAttempt.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends LevelUpAttemptFindManyArgs>(args?: SelectSubset<T, LevelUpAttemptFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpAttemptPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a LevelUpAttempt.
     * @param {LevelUpAttemptCreateArgs} args - Arguments to create a LevelUpAttempt.
     * @example
     * // Create one LevelUpAttempt
     * const LevelUpAttempt = await prisma.levelUpAttempt.create({
     *   data: {
     *     // ... data to create a LevelUpAttempt
     *   }
     * })
     * 
     */
    create<T extends LevelUpAttemptCreateArgs>(args: SelectSubset<T, LevelUpAttemptCreateArgs<ExtArgs>>): Prisma__LevelUpAttemptClient<$Result.GetResult<Prisma.$LevelUpAttemptPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many LevelUpAttempts.
     * @param {LevelUpAttemptCreateManyArgs} args - Arguments to create many LevelUpAttempts.
     * @example
     * // Create many LevelUpAttempts
     * const levelUpAttempt = await prisma.levelUpAttempt.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends LevelUpAttemptCreateManyArgs>(args?: SelectSubset<T, LevelUpAttemptCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many LevelUpAttempts and returns the data saved in the database.
     * @param {LevelUpAttemptCreateManyAndReturnArgs} args - Arguments to create many LevelUpAttempts.
     * @example
     * // Create many LevelUpAttempts
     * const levelUpAttempt = await prisma.levelUpAttempt.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many LevelUpAttempts and only return the `id`
     * const levelUpAttemptWithIdOnly = await prisma.levelUpAttempt.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends LevelUpAttemptCreateManyAndReturnArgs>(args?: SelectSubset<T, LevelUpAttemptCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpAttemptPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a LevelUpAttempt.
     * @param {LevelUpAttemptDeleteArgs} args - Arguments to delete one LevelUpAttempt.
     * @example
     * // Delete one LevelUpAttempt
     * const LevelUpAttempt = await prisma.levelUpAttempt.delete({
     *   where: {
     *     // ... filter to delete one LevelUpAttempt
     *   }
     * })
     * 
     */
    delete<T extends LevelUpAttemptDeleteArgs>(args: SelectSubset<T, LevelUpAttemptDeleteArgs<ExtArgs>>): Prisma__LevelUpAttemptClient<$Result.GetResult<Prisma.$LevelUpAttemptPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one LevelUpAttempt.
     * @param {LevelUpAttemptUpdateArgs} args - Arguments to update one LevelUpAttempt.
     * @example
     * // Update one LevelUpAttempt
     * const levelUpAttempt = await prisma.levelUpAttempt.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends LevelUpAttemptUpdateArgs>(args: SelectSubset<T, LevelUpAttemptUpdateArgs<ExtArgs>>): Prisma__LevelUpAttemptClient<$Result.GetResult<Prisma.$LevelUpAttemptPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more LevelUpAttempts.
     * @param {LevelUpAttemptDeleteManyArgs} args - Arguments to filter LevelUpAttempts to delete.
     * @example
     * // Delete a few LevelUpAttempts
     * const { count } = await prisma.levelUpAttempt.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends LevelUpAttemptDeleteManyArgs>(args?: SelectSubset<T, LevelUpAttemptDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more LevelUpAttempts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpAttemptUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many LevelUpAttempts
     * const levelUpAttempt = await prisma.levelUpAttempt.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends LevelUpAttemptUpdateManyArgs>(args: SelectSubset<T, LevelUpAttemptUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one LevelUpAttempt.
     * @param {LevelUpAttemptUpsertArgs} args - Arguments to update or create a LevelUpAttempt.
     * @example
     * // Update or create a LevelUpAttempt
     * const levelUpAttempt = await prisma.levelUpAttempt.upsert({
     *   create: {
     *     // ... data to create a LevelUpAttempt
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the LevelUpAttempt we want to update
     *   }
     * })
     */
    upsert<T extends LevelUpAttemptUpsertArgs>(args: SelectSubset<T, LevelUpAttemptUpsertArgs<ExtArgs>>): Prisma__LevelUpAttemptClient<$Result.GetResult<Prisma.$LevelUpAttemptPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of LevelUpAttempts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpAttemptCountArgs} args - Arguments to filter LevelUpAttempts to count.
     * @example
     * // Count the number of LevelUpAttempts
     * const count = await prisma.levelUpAttempt.count({
     *   where: {
     *     // ... the filter for the LevelUpAttempts we want to count
     *   }
     * })
    **/
    count<T extends LevelUpAttemptCountArgs>(
      args?: Subset<T, LevelUpAttemptCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], LevelUpAttemptCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a LevelUpAttempt.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpAttemptAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends LevelUpAttemptAggregateArgs>(args: Subset<T, LevelUpAttemptAggregateArgs>): Prisma.PrismaPromise<GetLevelUpAttemptAggregateType<T>>

    /**
     * Group by LevelUpAttempt.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpAttemptGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends LevelUpAttemptGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: LevelUpAttemptGroupByArgs['orderBy'] }
        : { orderBy?: LevelUpAttemptGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, LevelUpAttemptGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLevelUpAttemptGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the LevelUpAttempt model
   */
  readonly fields: LevelUpAttemptFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for LevelUpAttempt.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__LevelUpAttemptClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    publishing<T extends LevelUpPublishingDefaultArgs<ExtArgs> = {}>(args?: Subset<T, LevelUpPublishingDefaultArgs<ExtArgs>>): Prisma__LevelUpPublishingClient<$Result.GetResult<Prisma.$LevelUpPublishingPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    answers<T extends LevelUpAttempt$answersArgs<ExtArgs> = {}>(args?: Subset<T, LevelUpAttempt$answersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpAttemptAnswerPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the LevelUpAttempt model
   */ 
  interface LevelUpAttemptFieldRefs {
    readonly id: FieldRef<"LevelUpAttempt", 'String'>
    readonly publishingId: FieldRef<"LevelUpAttempt", 'String'>
    readonly studentName: FieldRef<"LevelUpAttempt", 'String'>
    readonly email: FieldRef<"LevelUpAttempt", 'String'>
    readonly schoolName: FieldRef<"LevelUpAttempt", 'String'>
    readonly studentPhone: FieldRef<"LevelUpAttempt", 'String'>
    readonly country: FieldRef<"LevelUpAttempt", 'String'>
    readonly emirateCity: FieldRef<"LevelUpAttempt", 'String'>
    readonly classLevel: FieldRef<"LevelUpAttempt", 'String'>
    readonly curriculum: FieldRef<"LevelUpAttempt", 'String'>
    readonly status: FieldRef<"LevelUpAttempt", 'String'>
    readonly startedAt: FieldRef<"LevelUpAttempt", 'DateTime'>
    readonly submittedAt: FieldRef<"LevelUpAttempt", 'DateTime'>
    readonly scoreObtained: FieldRef<"LevelUpAttempt", 'Int'>
    readonly totalMarks: FieldRef<"LevelUpAttempt", 'Int'>
    readonly percentage: FieldRef<"LevelUpAttempt", 'Int'>
    readonly correctCount: FieldRef<"LevelUpAttempt", 'Int'>
    readonly wrongCount: FieldRef<"LevelUpAttempt", 'Int'>
    readonly unansweredCount: FieldRef<"LevelUpAttempt", 'Int'>
    readonly paperSnapshotJson: FieldRef<"LevelUpAttempt", 'Json'>
    readonly resultSnapshotJson: FieldRef<"LevelUpAttempt", 'Json'>
    readonly sessionTokenHash: FieldRef<"LevelUpAttempt", 'String'>
    readonly createdAt: FieldRef<"LevelUpAttempt", 'DateTime'>
    readonly updatedAt: FieldRef<"LevelUpAttempt", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * LevelUpAttempt findUnique
   */
  export type LevelUpAttemptFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttempt
     */
    select?: LevelUpAttemptSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpAttempt to fetch.
     */
    where: LevelUpAttemptWhereUniqueInput
  }

  /**
   * LevelUpAttempt findUniqueOrThrow
   */
  export type LevelUpAttemptFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttempt
     */
    select?: LevelUpAttemptSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpAttempt to fetch.
     */
    where: LevelUpAttemptWhereUniqueInput
  }

  /**
   * LevelUpAttempt findFirst
   */
  export type LevelUpAttemptFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttempt
     */
    select?: LevelUpAttemptSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpAttempt to fetch.
     */
    where?: LevelUpAttemptWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpAttempts to fetch.
     */
    orderBy?: LevelUpAttemptOrderByWithRelationInput | LevelUpAttemptOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LevelUpAttempts.
     */
    cursor?: LevelUpAttemptWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpAttempts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpAttempts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LevelUpAttempts.
     */
    distinct?: LevelUpAttemptScalarFieldEnum | LevelUpAttemptScalarFieldEnum[]
  }

  /**
   * LevelUpAttempt findFirstOrThrow
   */
  export type LevelUpAttemptFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttempt
     */
    select?: LevelUpAttemptSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpAttempt to fetch.
     */
    where?: LevelUpAttemptWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpAttempts to fetch.
     */
    orderBy?: LevelUpAttemptOrderByWithRelationInput | LevelUpAttemptOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LevelUpAttempts.
     */
    cursor?: LevelUpAttemptWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpAttempts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpAttempts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LevelUpAttempts.
     */
    distinct?: LevelUpAttemptScalarFieldEnum | LevelUpAttemptScalarFieldEnum[]
  }

  /**
   * LevelUpAttempt findMany
   */
  export type LevelUpAttemptFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttempt
     */
    select?: LevelUpAttemptSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpAttempts to fetch.
     */
    where?: LevelUpAttemptWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpAttempts to fetch.
     */
    orderBy?: LevelUpAttemptOrderByWithRelationInput | LevelUpAttemptOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing LevelUpAttempts.
     */
    cursor?: LevelUpAttemptWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpAttempts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpAttempts.
     */
    skip?: number
    distinct?: LevelUpAttemptScalarFieldEnum | LevelUpAttemptScalarFieldEnum[]
  }

  /**
   * LevelUpAttempt create
   */
  export type LevelUpAttemptCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttempt
     */
    select?: LevelUpAttemptSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptInclude<ExtArgs> | null
    /**
     * The data needed to create a LevelUpAttempt.
     */
    data: XOR<LevelUpAttemptCreateInput, LevelUpAttemptUncheckedCreateInput>
  }

  /**
   * LevelUpAttempt createMany
   */
  export type LevelUpAttemptCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many LevelUpAttempts.
     */
    data: LevelUpAttemptCreateManyInput | LevelUpAttemptCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * LevelUpAttempt createManyAndReturn
   */
  export type LevelUpAttemptCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttempt
     */
    select?: LevelUpAttemptSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many LevelUpAttempts.
     */
    data: LevelUpAttemptCreateManyInput | LevelUpAttemptCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * LevelUpAttempt update
   */
  export type LevelUpAttemptUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttempt
     */
    select?: LevelUpAttemptSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptInclude<ExtArgs> | null
    /**
     * The data needed to update a LevelUpAttempt.
     */
    data: XOR<LevelUpAttemptUpdateInput, LevelUpAttemptUncheckedUpdateInput>
    /**
     * Choose, which LevelUpAttempt to update.
     */
    where: LevelUpAttemptWhereUniqueInput
  }

  /**
   * LevelUpAttempt updateMany
   */
  export type LevelUpAttemptUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update LevelUpAttempts.
     */
    data: XOR<LevelUpAttemptUpdateManyMutationInput, LevelUpAttemptUncheckedUpdateManyInput>
    /**
     * Filter which LevelUpAttempts to update
     */
    where?: LevelUpAttemptWhereInput
  }

  /**
   * LevelUpAttempt upsert
   */
  export type LevelUpAttemptUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttempt
     */
    select?: LevelUpAttemptSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptInclude<ExtArgs> | null
    /**
     * The filter to search for the LevelUpAttempt to update in case it exists.
     */
    where: LevelUpAttemptWhereUniqueInput
    /**
     * In case the LevelUpAttempt found by the `where` argument doesn't exist, create a new LevelUpAttempt with this data.
     */
    create: XOR<LevelUpAttemptCreateInput, LevelUpAttemptUncheckedCreateInput>
    /**
     * In case the LevelUpAttempt was found with the provided `where` argument, update it with this data.
     */
    update: XOR<LevelUpAttemptUpdateInput, LevelUpAttemptUncheckedUpdateInput>
  }

  /**
   * LevelUpAttempt delete
   */
  export type LevelUpAttemptDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttempt
     */
    select?: LevelUpAttemptSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptInclude<ExtArgs> | null
    /**
     * Filter which LevelUpAttempt to delete.
     */
    where: LevelUpAttemptWhereUniqueInput
  }

  /**
   * LevelUpAttempt deleteMany
   */
  export type LevelUpAttemptDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LevelUpAttempts to delete
     */
    where?: LevelUpAttemptWhereInput
  }

  /**
   * LevelUpAttempt.answers
   */
  export type LevelUpAttempt$answersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttemptAnswer
     */
    select?: LevelUpAttemptAnswerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptAnswerInclude<ExtArgs> | null
    where?: LevelUpAttemptAnswerWhereInput
    orderBy?: LevelUpAttemptAnswerOrderByWithRelationInput | LevelUpAttemptAnswerOrderByWithRelationInput[]
    cursor?: LevelUpAttemptAnswerWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LevelUpAttemptAnswerScalarFieldEnum | LevelUpAttemptAnswerScalarFieldEnum[]
  }

  /**
   * LevelUpAttempt without action
   */
  export type LevelUpAttemptDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttempt
     */
    select?: LevelUpAttemptSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptInclude<ExtArgs> | null
  }


  /**
   * Model LevelUpAttemptAnswer
   */

  export type AggregateLevelUpAttemptAnswer = {
    _count: LevelUpAttemptAnswerCountAggregateOutputType | null
    _min: LevelUpAttemptAnswerMinAggregateOutputType | null
    _max: LevelUpAttemptAnswerMaxAggregateOutputType | null
  }

  export type LevelUpAttemptAnswerMinAggregateOutputType = {
    id: string | null
    attemptId: string | null
    questionId: string | null
    selectedOption: string | null
    answeredAt: Date | null
  }

  export type LevelUpAttemptAnswerMaxAggregateOutputType = {
    id: string | null
    attemptId: string | null
    questionId: string | null
    selectedOption: string | null
    answeredAt: Date | null
  }

  export type LevelUpAttemptAnswerCountAggregateOutputType = {
    id: number
    attemptId: number
    questionId: number
    selectedOption: number
    answeredAt: number
    _all: number
  }


  export type LevelUpAttemptAnswerMinAggregateInputType = {
    id?: true
    attemptId?: true
    questionId?: true
    selectedOption?: true
    answeredAt?: true
  }

  export type LevelUpAttemptAnswerMaxAggregateInputType = {
    id?: true
    attemptId?: true
    questionId?: true
    selectedOption?: true
    answeredAt?: true
  }

  export type LevelUpAttemptAnswerCountAggregateInputType = {
    id?: true
    attemptId?: true
    questionId?: true
    selectedOption?: true
    answeredAt?: true
    _all?: true
  }

  export type LevelUpAttemptAnswerAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LevelUpAttemptAnswer to aggregate.
     */
    where?: LevelUpAttemptAnswerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpAttemptAnswers to fetch.
     */
    orderBy?: LevelUpAttemptAnswerOrderByWithRelationInput | LevelUpAttemptAnswerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: LevelUpAttemptAnswerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpAttemptAnswers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpAttemptAnswers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned LevelUpAttemptAnswers
    **/
    _count?: true | LevelUpAttemptAnswerCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: LevelUpAttemptAnswerMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: LevelUpAttemptAnswerMaxAggregateInputType
  }

  export type GetLevelUpAttemptAnswerAggregateType<T extends LevelUpAttemptAnswerAggregateArgs> = {
        [P in keyof T & keyof AggregateLevelUpAttemptAnswer]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLevelUpAttemptAnswer[P]>
      : GetScalarType<T[P], AggregateLevelUpAttemptAnswer[P]>
  }




  export type LevelUpAttemptAnswerGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LevelUpAttemptAnswerWhereInput
    orderBy?: LevelUpAttemptAnswerOrderByWithAggregationInput | LevelUpAttemptAnswerOrderByWithAggregationInput[]
    by: LevelUpAttemptAnswerScalarFieldEnum[] | LevelUpAttemptAnswerScalarFieldEnum
    having?: LevelUpAttemptAnswerScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: LevelUpAttemptAnswerCountAggregateInputType | true
    _min?: LevelUpAttemptAnswerMinAggregateInputType
    _max?: LevelUpAttemptAnswerMaxAggregateInputType
  }

  export type LevelUpAttemptAnswerGroupByOutputType = {
    id: string
    attemptId: string
    questionId: string
    selectedOption: string
    answeredAt: Date
    _count: LevelUpAttemptAnswerCountAggregateOutputType | null
    _min: LevelUpAttemptAnswerMinAggregateOutputType | null
    _max: LevelUpAttemptAnswerMaxAggregateOutputType | null
  }

  type GetLevelUpAttemptAnswerGroupByPayload<T extends LevelUpAttemptAnswerGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<LevelUpAttemptAnswerGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof LevelUpAttemptAnswerGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], LevelUpAttemptAnswerGroupByOutputType[P]>
            : GetScalarType<T[P], LevelUpAttemptAnswerGroupByOutputType[P]>
        }
      >
    >


  export type LevelUpAttemptAnswerSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    attemptId?: boolean
    questionId?: boolean
    selectedOption?: boolean
    answeredAt?: boolean
    attempt?: boolean | LevelUpAttemptDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["levelUpAttemptAnswer"]>

  export type LevelUpAttemptAnswerSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    attemptId?: boolean
    questionId?: boolean
    selectedOption?: boolean
    answeredAt?: boolean
    attempt?: boolean | LevelUpAttemptDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["levelUpAttemptAnswer"]>

  export type LevelUpAttemptAnswerSelectScalar = {
    id?: boolean
    attemptId?: boolean
    questionId?: boolean
    selectedOption?: boolean
    answeredAt?: boolean
  }

  export type LevelUpAttemptAnswerInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    attempt?: boolean | LevelUpAttemptDefaultArgs<ExtArgs>
  }
  export type LevelUpAttemptAnswerIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    attempt?: boolean | LevelUpAttemptDefaultArgs<ExtArgs>
  }

  export type $LevelUpAttemptAnswerPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "LevelUpAttemptAnswer"
    objects: {
      attempt: Prisma.$LevelUpAttemptPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      attemptId: string
      questionId: string
      selectedOption: string
      answeredAt: Date
    }, ExtArgs["result"]["levelUpAttemptAnswer"]>
    composites: {}
  }

  type LevelUpAttemptAnswerGetPayload<S extends boolean | null | undefined | LevelUpAttemptAnswerDefaultArgs> = $Result.GetResult<Prisma.$LevelUpAttemptAnswerPayload, S>

  type LevelUpAttemptAnswerCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<LevelUpAttemptAnswerFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: LevelUpAttemptAnswerCountAggregateInputType | true
    }

  export interface LevelUpAttemptAnswerDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['LevelUpAttemptAnswer'], meta: { name: 'LevelUpAttemptAnswer' } }
    /**
     * Find zero or one LevelUpAttemptAnswer that matches the filter.
     * @param {LevelUpAttemptAnswerFindUniqueArgs} args - Arguments to find a LevelUpAttemptAnswer
     * @example
     * // Get one LevelUpAttemptAnswer
     * const levelUpAttemptAnswer = await prisma.levelUpAttemptAnswer.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends LevelUpAttemptAnswerFindUniqueArgs>(args: SelectSubset<T, LevelUpAttemptAnswerFindUniqueArgs<ExtArgs>>): Prisma__LevelUpAttemptAnswerClient<$Result.GetResult<Prisma.$LevelUpAttemptAnswerPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one LevelUpAttemptAnswer that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {LevelUpAttemptAnswerFindUniqueOrThrowArgs} args - Arguments to find a LevelUpAttemptAnswer
     * @example
     * // Get one LevelUpAttemptAnswer
     * const levelUpAttemptAnswer = await prisma.levelUpAttemptAnswer.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends LevelUpAttemptAnswerFindUniqueOrThrowArgs>(args: SelectSubset<T, LevelUpAttemptAnswerFindUniqueOrThrowArgs<ExtArgs>>): Prisma__LevelUpAttemptAnswerClient<$Result.GetResult<Prisma.$LevelUpAttemptAnswerPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first LevelUpAttemptAnswer that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpAttemptAnswerFindFirstArgs} args - Arguments to find a LevelUpAttemptAnswer
     * @example
     * // Get one LevelUpAttemptAnswer
     * const levelUpAttemptAnswer = await prisma.levelUpAttemptAnswer.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends LevelUpAttemptAnswerFindFirstArgs>(args?: SelectSubset<T, LevelUpAttemptAnswerFindFirstArgs<ExtArgs>>): Prisma__LevelUpAttemptAnswerClient<$Result.GetResult<Prisma.$LevelUpAttemptAnswerPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first LevelUpAttemptAnswer that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpAttemptAnswerFindFirstOrThrowArgs} args - Arguments to find a LevelUpAttemptAnswer
     * @example
     * // Get one LevelUpAttemptAnswer
     * const levelUpAttemptAnswer = await prisma.levelUpAttemptAnswer.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends LevelUpAttemptAnswerFindFirstOrThrowArgs>(args?: SelectSubset<T, LevelUpAttemptAnswerFindFirstOrThrowArgs<ExtArgs>>): Prisma__LevelUpAttemptAnswerClient<$Result.GetResult<Prisma.$LevelUpAttemptAnswerPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more LevelUpAttemptAnswers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpAttemptAnswerFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all LevelUpAttemptAnswers
     * const levelUpAttemptAnswers = await prisma.levelUpAttemptAnswer.findMany()
     * 
     * // Get first 10 LevelUpAttemptAnswers
     * const levelUpAttemptAnswers = await prisma.levelUpAttemptAnswer.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const levelUpAttemptAnswerWithIdOnly = await prisma.levelUpAttemptAnswer.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends LevelUpAttemptAnswerFindManyArgs>(args?: SelectSubset<T, LevelUpAttemptAnswerFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpAttemptAnswerPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a LevelUpAttemptAnswer.
     * @param {LevelUpAttemptAnswerCreateArgs} args - Arguments to create a LevelUpAttemptAnswer.
     * @example
     * // Create one LevelUpAttemptAnswer
     * const LevelUpAttemptAnswer = await prisma.levelUpAttemptAnswer.create({
     *   data: {
     *     // ... data to create a LevelUpAttemptAnswer
     *   }
     * })
     * 
     */
    create<T extends LevelUpAttemptAnswerCreateArgs>(args: SelectSubset<T, LevelUpAttemptAnswerCreateArgs<ExtArgs>>): Prisma__LevelUpAttemptAnswerClient<$Result.GetResult<Prisma.$LevelUpAttemptAnswerPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many LevelUpAttemptAnswers.
     * @param {LevelUpAttemptAnswerCreateManyArgs} args - Arguments to create many LevelUpAttemptAnswers.
     * @example
     * // Create many LevelUpAttemptAnswers
     * const levelUpAttemptAnswer = await prisma.levelUpAttemptAnswer.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends LevelUpAttemptAnswerCreateManyArgs>(args?: SelectSubset<T, LevelUpAttemptAnswerCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many LevelUpAttemptAnswers and returns the data saved in the database.
     * @param {LevelUpAttemptAnswerCreateManyAndReturnArgs} args - Arguments to create many LevelUpAttemptAnswers.
     * @example
     * // Create many LevelUpAttemptAnswers
     * const levelUpAttemptAnswer = await prisma.levelUpAttemptAnswer.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many LevelUpAttemptAnswers and only return the `id`
     * const levelUpAttemptAnswerWithIdOnly = await prisma.levelUpAttemptAnswer.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends LevelUpAttemptAnswerCreateManyAndReturnArgs>(args?: SelectSubset<T, LevelUpAttemptAnswerCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LevelUpAttemptAnswerPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a LevelUpAttemptAnswer.
     * @param {LevelUpAttemptAnswerDeleteArgs} args - Arguments to delete one LevelUpAttemptAnswer.
     * @example
     * // Delete one LevelUpAttemptAnswer
     * const LevelUpAttemptAnswer = await prisma.levelUpAttemptAnswer.delete({
     *   where: {
     *     // ... filter to delete one LevelUpAttemptAnswer
     *   }
     * })
     * 
     */
    delete<T extends LevelUpAttemptAnswerDeleteArgs>(args: SelectSubset<T, LevelUpAttemptAnswerDeleteArgs<ExtArgs>>): Prisma__LevelUpAttemptAnswerClient<$Result.GetResult<Prisma.$LevelUpAttemptAnswerPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one LevelUpAttemptAnswer.
     * @param {LevelUpAttemptAnswerUpdateArgs} args - Arguments to update one LevelUpAttemptAnswer.
     * @example
     * // Update one LevelUpAttemptAnswer
     * const levelUpAttemptAnswer = await prisma.levelUpAttemptAnswer.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends LevelUpAttemptAnswerUpdateArgs>(args: SelectSubset<T, LevelUpAttemptAnswerUpdateArgs<ExtArgs>>): Prisma__LevelUpAttemptAnswerClient<$Result.GetResult<Prisma.$LevelUpAttemptAnswerPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more LevelUpAttemptAnswers.
     * @param {LevelUpAttemptAnswerDeleteManyArgs} args - Arguments to filter LevelUpAttemptAnswers to delete.
     * @example
     * // Delete a few LevelUpAttemptAnswers
     * const { count } = await prisma.levelUpAttemptAnswer.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends LevelUpAttemptAnswerDeleteManyArgs>(args?: SelectSubset<T, LevelUpAttemptAnswerDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more LevelUpAttemptAnswers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpAttemptAnswerUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many LevelUpAttemptAnswers
     * const levelUpAttemptAnswer = await prisma.levelUpAttemptAnswer.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends LevelUpAttemptAnswerUpdateManyArgs>(args: SelectSubset<T, LevelUpAttemptAnswerUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one LevelUpAttemptAnswer.
     * @param {LevelUpAttemptAnswerUpsertArgs} args - Arguments to update or create a LevelUpAttemptAnswer.
     * @example
     * // Update or create a LevelUpAttemptAnswer
     * const levelUpAttemptAnswer = await prisma.levelUpAttemptAnswer.upsert({
     *   create: {
     *     // ... data to create a LevelUpAttemptAnswer
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the LevelUpAttemptAnswer we want to update
     *   }
     * })
     */
    upsert<T extends LevelUpAttemptAnswerUpsertArgs>(args: SelectSubset<T, LevelUpAttemptAnswerUpsertArgs<ExtArgs>>): Prisma__LevelUpAttemptAnswerClient<$Result.GetResult<Prisma.$LevelUpAttemptAnswerPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of LevelUpAttemptAnswers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpAttemptAnswerCountArgs} args - Arguments to filter LevelUpAttemptAnswers to count.
     * @example
     * // Count the number of LevelUpAttemptAnswers
     * const count = await prisma.levelUpAttemptAnswer.count({
     *   where: {
     *     // ... the filter for the LevelUpAttemptAnswers we want to count
     *   }
     * })
    **/
    count<T extends LevelUpAttemptAnswerCountArgs>(
      args?: Subset<T, LevelUpAttemptAnswerCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], LevelUpAttemptAnswerCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a LevelUpAttemptAnswer.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpAttemptAnswerAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends LevelUpAttemptAnswerAggregateArgs>(args: Subset<T, LevelUpAttemptAnswerAggregateArgs>): Prisma.PrismaPromise<GetLevelUpAttemptAnswerAggregateType<T>>

    /**
     * Group by LevelUpAttemptAnswer.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LevelUpAttemptAnswerGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends LevelUpAttemptAnswerGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: LevelUpAttemptAnswerGroupByArgs['orderBy'] }
        : { orderBy?: LevelUpAttemptAnswerGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, LevelUpAttemptAnswerGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLevelUpAttemptAnswerGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the LevelUpAttemptAnswer model
   */
  readonly fields: LevelUpAttemptAnswerFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for LevelUpAttemptAnswer.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__LevelUpAttemptAnswerClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    attempt<T extends LevelUpAttemptDefaultArgs<ExtArgs> = {}>(args?: Subset<T, LevelUpAttemptDefaultArgs<ExtArgs>>): Prisma__LevelUpAttemptClient<$Result.GetResult<Prisma.$LevelUpAttemptPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the LevelUpAttemptAnswer model
   */ 
  interface LevelUpAttemptAnswerFieldRefs {
    readonly id: FieldRef<"LevelUpAttemptAnswer", 'String'>
    readonly attemptId: FieldRef<"LevelUpAttemptAnswer", 'String'>
    readonly questionId: FieldRef<"LevelUpAttemptAnswer", 'String'>
    readonly selectedOption: FieldRef<"LevelUpAttemptAnswer", 'String'>
    readonly answeredAt: FieldRef<"LevelUpAttemptAnswer", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * LevelUpAttemptAnswer findUnique
   */
  export type LevelUpAttemptAnswerFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttemptAnswer
     */
    select?: LevelUpAttemptAnswerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptAnswerInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpAttemptAnswer to fetch.
     */
    where: LevelUpAttemptAnswerWhereUniqueInput
  }

  /**
   * LevelUpAttemptAnswer findUniqueOrThrow
   */
  export type LevelUpAttemptAnswerFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttemptAnswer
     */
    select?: LevelUpAttemptAnswerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptAnswerInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpAttemptAnswer to fetch.
     */
    where: LevelUpAttemptAnswerWhereUniqueInput
  }

  /**
   * LevelUpAttemptAnswer findFirst
   */
  export type LevelUpAttemptAnswerFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttemptAnswer
     */
    select?: LevelUpAttemptAnswerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptAnswerInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpAttemptAnswer to fetch.
     */
    where?: LevelUpAttemptAnswerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpAttemptAnswers to fetch.
     */
    orderBy?: LevelUpAttemptAnswerOrderByWithRelationInput | LevelUpAttemptAnswerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LevelUpAttemptAnswers.
     */
    cursor?: LevelUpAttemptAnswerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpAttemptAnswers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpAttemptAnswers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LevelUpAttemptAnswers.
     */
    distinct?: LevelUpAttemptAnswerScalarFieldEnum | LevelUpAttemptAnswerScalarFieldEnum[]
  }

  /**
   * LevelUpAttemptAnswer findFirstOrThrow
   */
  export type LevelUpAttemptAnswerFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttemptAnswer
     */
    select?: LevelUpAttemptAnswerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptAnswerInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpAttemptAnswer to fetch.
     */
    where?: LevelUpAttemptAnswerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpAttemptAnswers to fetch.
     */
    orderBy?: LevelUpAttemptAnswerOrderByWithRelationInput | LevelUpAttemptAnswerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LevelUpAttemptAnswers.
     */
    cursor?: LevelUpAttemptAnswerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpAttemptAnswers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpAttemptAnswers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LevelUpAttemptAnswers.
     */
    distinct?: LevelUpAttemptAnswerScalarFieldEnum | LevelUpAttemptAnswerScalarFieldEnum[]
  }

  /**
   * LevelUpAttemptAnswer findMany
   */
  export type LevelUpAttemptAnswerFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttemptAnswer
     */
    select?: LevelUpAttemptAnswerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptAnswerInclude<ExtArgs> | null
    /**
     * Filter, which LevelUpAttemptAnswers to fetch.
     */
    where?: LevelUpAttemptAnswerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LevelUpAttemptAnswers to fetch.
     */
    orderBy?: LevelUpAttemptAnswerOrderByWithRelationInput | LevelUpAttemptAnswerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing LevelUpAttemptAnswers.
     */
    cursor?: LevelUpAttemptAnswerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LevelUpAttemptAnswers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LevelUpAttemptAnswers.
     */
    skip?: number
    distinct?: LevelUpAttemptAnswerScalarFieldEnum | LevelUpAttemptAnswerScalarFieldEnum[]
  }

  /**
   * LevelUpAttemptAnswer create
   */
  export type LevelUpAttemptAnswerCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttemptAnswer
     */
    select?: LevelUpAttemptAnswerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptAnswerInclude<ExtArgs> | null
    /**
     * The data needed to create a LevelUpAttemptAnswer.
     */
    data: XOR<LevelUpAttemptAnswerCreateInput, LevelUpAttemptAnswerUncheckedCreateInput>
  }

  /**
   * LevelUpAttemptAnswer createMany
   */
  export type LevelUpAttemptAnswerCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many LevelUpAttemptAnswers.
     */
    data: LevelUpAttemptAnswerCreateManyInput | LevelUpAttemptAnswerCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * LevelUpAttemptAnswer createManyAndReturn
   */
  export type LevelUpAttemptAnswerCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttemptAnswer
     */
    select?: LevelUpAttemptAnswerSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many LevelUpAttemptAnswers.
     */
    data: LevelUpAttemptAnswerCreateManyInput | LevelUpAttemptAnswerCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptAnswerIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * LevelUpAttemptAnswer update
   */
  export type LevelUpAttemptAnswerUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttemptAnswer
     */
    select?: LevelUpAttemptAnswerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptAnswerInclude<ExtArgs> | null
    /**
     * The data needed to update a LevelUpAttemptAnswer.
     */
    data: XOR<LevelUpAttemptAnswerUpdateInput, LevelUpAttemptAnswerUncheckedUpdateInput>
    /**
     * Choose, which LevelUpAttemptAnswer to update.
     */
    where: LevelUpAttemptAnswerWhereUniqueInput
  }

  /**
   * LevelUpAttemptAnswer updateMany
   */
  export type LevelUpAttemptAnswerUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update LevelUpAttemptAnswers.
     */
    data: XOR<LevelUpAttemptAnswerUpdateManyMutationInput, LevelUpAttemptAnswerUncheckedUpdateManyInput>
    /**
     * Filter which LevelUpAttemptAnswers to update
     */
    where?: LevelUpAttemptAnswerWhereInput
  }

  /**
   * LevelUpAttemptAnswer upsert
   */
  export type LevelUpAttemptAnswerUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttemptAnswer
     */
    select?: LevelUpAttemptAnswerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptAnswerInclude<ExtArgs> | null
    /**
     * The filter to search for the LevelUpAttemptAnswer to update in case it exists.
     */
    where: LevelUpAttemptAnswerWhereUniqueInput
    /**
     * In case the LevelUpAttemptAnswer found by the `where` argument doesn't exist, create a new LevelUpAttemptAnswer with this data.
     */
    create: XOR<LevelUpAttemptAnswerCreateInput, LevelUpAttemptAnswerUncheckedCreateInput>
    /**
     * In case the LevelUpAttemptAnswer was found with the provided `where` argument, update it with this data.
     */
    update: XOR<LevelUpAttemptAnswerUpdateInput, LevelUpAttemptAnswerUncheckedUpdateInput>
  }

  /**
   * LevelUpAttemptAnswer delete
   */
  export type LevelUpAttemptAnswerDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttemptAnswer
     */
    select?: LevelUpAttemptAnswerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptAnswerInclude<ExtArgs> | null
    /**
     * Filter which LevelUpAttemptAnswer to delete.
     */
    where: LevelUpAttemptAnswerWhereUniqueInput
  }

  /**
   * LevelUpAttemptAnswer deleteMany
   */
  export type LevelUpAttemptAnswerDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LevelUpAttemptAnswers to delete
     */
    where?: LevelUpAttemptAnswerWhereInput
  }

  /**
   * LevelUpAttemptAnswer without action
   */
  export type LevelUpAttemptAnswerDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LevelUpAttemptAnswer
     */
    select?: LevelUpAttemptAnswerSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LevelUpAttemptAnswerInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const LevelUpSubjectScalarFieldEnum: {
    code: 'code',
    name: 'name',
    createdAt: 'createdAt'
  };

  export type LevelUpSubjectScalarFieldEnum = (typeof LevelUpSubjectScalarFieldEnum)[keyof typeof LevelUpSubjectScalarFieldEnum]


  export const LevelUpQuestionScalarFieldEnum: {
    id: 'id',
    subjectCode: 'subjectCode',
    classLevel: 'classLevel',
    questionText: 'questionText',
    difficulty: 'difficulty',
    correctOption: 'correctOption',
    explanation: 'explanation',
    isActive: 'isActive',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type LevelUpQuestionScalarFieldEnum = (typeof LevelUpQuestionScalarFieldEnum)[keyof typeof LevelUpQuestionScalarFieldEnum]


  export const LevelUpQuestionOptionScalarFieldEnum: {
    id: 'id',
    questionId: 'questionId',
    optionKey: 'optionKey',
    optionText: 'optionText',
    displayOrder: 'displayOrder'
  };

  export type LevelUpQuestionOptionScalarFieldEnum = (typeof LevelUpQuestionOptionScalarFieldEnum)[keyof typeof LevelUpQuestionOptionScalarFieldEnum]


  export const LevelUpPaperScalarFieldEnum: {
    id: 'id',
    title: 'title',
    subjectCode: 'subjectCode',
    classLevel: 'classLevel',
    durationMinutes: 'durationMinutes',
    totalQuestions: 'totalQuestions',
    totalMarks: 'totalMarks',
    status: 'status',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type LevelUpPaperScalarFieldEnum = (typeof LevelUpPaperScalarFieldEnum)[keyof typeof LevelUpPaperScalarFieldEnum]


  export const LevelUpPaperQuestionScalarFieldEnum: {
    id: 'id',
    paperId: 'paperId',
    questionId: 'questionId',
    displayOrder: 'displayOrder',
    marks: 'marks'
  };

  export type LevelUpPaperQuestionScalarFieldEnum = (typeof LevelUpPaperQuestionScalarFieldEnum)[keyof typeof LevelUpPaperQuestionScalarFieldEnum]


  export const LevelUpPublishingScalarFieldEnum: {
    id: 'id',
    slug: 'slug',
    title: 'title',
    paperId: 'paperId',
    classLevel: 'classLevel',
    subjectCode: 'subjectCode',
    durationMinutes: 'durationMinutes',
    startAt: 'startAt',
    endAt: 'endAt',
    isActive: 'isActive',
    createdAt: 'createdAt'
  };

  export type LevelUpPublishingScalarFieldEnum = (typeof LevelUpPublishingScalarFieldEnum)[keyof typeof LevelUpPublishingScalarFieldEnum]


  export const LevelUpRegistrationScalarFieldEnum: {
    id: 'id',
    studentName: 'studentName',
    email: 'email',
    schoolName: 'schoolName',
    phone: 'phone',
    country: 'country',
    emirateCity: 'emirateCity',
    classLevel: 'classLevel',
    curriculum: 'curriculum',
    status: 'status',
    attemptId: 'attemptId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type LevelUpRegistrationScalarFieldEnum = (typeof LevelUpRegistrationScalarFieldEnum)[keyof typeof LevelUpRegistrationScalarFieldEnum]


  export const LevelUpAttemptScalarFieldEnum: {
    id: 'id',
    publishingId: 'publishingId',
    studentName: 'studentName',
    email: 'email',
    schoolName: 'schoolName',
    studentPhone: 'studentPhone',
    country: 'country',
    emirateCity: 'emirateCity',
    classLevel: 'classLevel',
    curriculum: 'curriculum',
    status: 'status',
    startedAt: 'startedAt',
    submittedAt: 'submittedAt',
    scoreObtained: 'scoreObtained',
    totalMarks: 'totalMarks',
    percentage: 'percentage',
    correctCount: 'correctCount',
    wrongCount: 'wrongCount',
    unansweredCount: 'unansweredCount',
    paperSnapshotJson: 'paperSnapshotJson',
    resultSnapshotJson: 'resultSnapshotJson',
    sessionTokenHash: 'sessionTokenHash',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type LevelUpAttemptScalarFieldEnum = (typeof LevelUpAttemptScalarFieldEnum)[keyof typeof LevelUpAttemptScalarFieldEnum]


  export const LevelUpAttemptAnswerScalarFieldEnum: {
    id: 'id',
    attemptId: 'attemptId',
    questionId: 'questionId',
    selectedOption: 'selectedOption',
    answeredAt: 'answeredAt'
  };

  export type LevelUpAttemptAnswerScalarFieldEnum = (typeof LevelUpAttemptAnswerScalarFieldEnum)[keyof typeof LevelUpAttemptAnswerScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type LevelUpSubjectWhereInput = {
    AND?: LevelUpSubjectWhereInput | LevelUpSubjectWhereInput[]
    OR?: LevelUpSubjectWhereInput[]
    NOT?: LevelUpSubjectWhereInput | LevelUpSubjectWhereInput[]
    code?: StringFilter<"LevelUpSubject"> | string
    name?: StringFilter<"LevelUpSubject"> | string
    createdAt?: DateTimeFilter<"LevelUpSubject"> | Date | string
    questions?: LevelUpQuestionListRelationFilter
    papers?: LevelUpPaperListRelationFilter
    publishings?: LevelUpPublishingListRelationFilter
  }

  export type LevelUpSubjectOrderByWithRelationInput = {
    code?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    questions?: LevelUpQuestionOrderByRelationAggregateInput
    papers?: LevelUpPaperOrderByRelationAggregateInput
    publishings?: LevelUpPublishingOrderByRelationAggregateInput
  }

  export type LevelUpSubjectWhereUniqueInput = Prisma.AtLeast<{
    code?: string
    AND?: LevelUpSubjectWhereInput | LevelUpSubjectWhereInput[]
    OR?: LevelUpSubjectWhereInput[]
    NOT?: LevelUpSubjectWhereInput | LevelUpSubjectWhereInput[]
    name?: StringFilter<"LevelUpSubject"> | string
    createdAt?: DateTimeFilter<"LevelUpSubject"> | Date | string
    questions?: LevelUpQuestionListRelationFilter
    papers?: LevelUpPaperListRelationFilter
    publishings?: LevelUpPublishingListRelationFilter
  }, "code">

  export type LevelUpSubjectOrderByWithAggregationInput = {
    code?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    _count?: LevelUpSubjectCountOrderByAggregateInput
    _max?: LevelUpSubjectMaxOrderByAggregateInput
    _min?: LevelUpSubjectMinOrderByAggregateInput
  }

  export type LevelUpSubjectScalarWhereWithAggregatesInput = {
    AND?: LevelUpSubjectScalarWhereWithAggregatesInput | LevelUpSubjectScalarWhereWithAggregatesInput[]
    OR?: LevelUpSubjectScalarWhereWithAggregatesInput[]
    NOT?: LevelUpSubjectScalarWhereWithAggregatesInput | LevelUpSubjectScalarWhereWithAggregatesInput[]
    code?: StringWithAggregatesFilter<"LevelUpSubject"> | string
    name?: StringWithAggregatesFilter<"LevelUpSubject"> | string
    createdAt?: DateTimeWithAggregatesFilter<"LevelUpSubject"> | Date | string
  }

  export type LevelUpQuestionWhereInput = {
    AND?: LevelUpQuestionWhereInput | LevelUpQuestionWhereInput[]
    OR?: LevelUpQuestionWhereInput[]
    NOT?: LevelUpQuestionWhereInput | LevelUpQuestionWhereInput[]
    id?: StringFilter<"LevelUpQuestion"> | string
    subjectCode?: StringFilter<"LevelUpQuestion"> | string
    classLevel?: StringFilter<"LevelUpQuestion"> | string
    questionText?: StringFilter<"LevelUpQuestion"> | string
    difficulty?: StringFilter<"LevelUpQuestion"> | string
    correctOption?: StringFilter<"LevelUpQuestion"> | string
    explanation?: StringNullableFilter<"LevelUpQuestion"> | string | null
    isActive?: BoolFilter<"LevelUpQuestion"> | boolean
    createdAt?: DateTimeFilter<"LevelUpQuestion"> | Date | string
    updatedAt?: DateTimeFilter<"LevelUpQuestion"> | Date | string
    subject?: XOR<LevelUpSubjectRelationFilter, LevelUpSubjectWhereInput>
    options?: LevelUpQuestionOptionListRelationFilter
    paperLinks?: LevelUpPaperQuestionListRelationFilter
  }

  export type LevelUpQuestionOrderByWithRelationInput = {
    id?: SortOrder
    subjectCode?: SortOrder
    classLevel?: SortOrder
    questionText?: SortOrder
    difficulty?: SortOrder
    correctOption?: SortOrder
    explanation?: SortOrderInput | SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    subject?: LevelUpSubjectOrderByWithRelationInput
    options?: LevelUpQuestionOptionOrderByRelationAggregateInput
    paperLinks?: LevelUpPaperQuestionOrderByRelationAggregateInput
  }

  export type LevelUpQuestionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: LevelUpQuestionWhereInput | LevelUpQuestionWhereInput[]
    OR?: LevelUpQuestionWhereInput[]
    NOT?: LevelUpQuestionWhereInput | LevelUpQuestionWhereInput[]
    subjectCode?: StringFilter<"LevelUpQuestion"> | string
    classLevel?: StringFilter<"LevelUpQuestion"> | string
    questionText?: StringFilter<"LevelUpQuestion"> | string
    difficulty?: StringFilter<"LevelUpQuestion"> | string
    correctOption?: StringFilter<"LevelUpQuestion"> | string
    explanation?: StringNullableFilter<"LevelUpQuestion"> | string | null
    isActive?: BoolFilter<"LevelUpQuestion"> | boolean
    createdAt?: DateTimeFilter<"LevelUpQuestion"> | Date | string
    updatedAt?: DateTimeFilter<"LevelUpQuestion"> | Date | string
    subject?: XOR<LevelUpSubjectRelationFilter, LevelUpSubjectWhereInput>
    options?: LevelUpQuestionOptionListRelationFilter
    paperLinks?: LevelUpPaperQuestionListRelationFilter
  }, "id">

  export type LevelUpQuestionOrderByWithAggregationInput = {
    id?: SortOrder
    subjectCode?: SortOrder
    classLevel?: SortOrder
    questionText?: SortOrder
    difficulty?: SortOrder
    correctOption?: SortOrder
    explanation?: SortOrderInput | SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: LevelUpQuestionCountOrderByAggregateInput
    _max?: LevelUpQuestionMaxOrderByAggregateInput
    _min?: LevelUpQuestionMinOrderByAggregateInput
  }

  export type LevelUpQuestionScalarWhereWithAggregatesInput = {
    AND?: LevelUpQuestionScalarWhereWithAggregatesInput | LevelUpQuestionScalarWhereWithAggregatesInput[]
    OR?: LevelUpQuestionScalarWhereWithAggregatesInput[]
    NOT?: LevelUpQuestionScalarWhereWithAggregatesInput | LevelUpQuestionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"LevelUpQuestion"> | string
    subjectCode?: StringWithAggregatesFilter<"LevelUpQuestion"> | string
    classLevel?: StringWithAggregatesFilter<"LevelUpQuestion"> | string
    questionText?: StringWithAggregatesFilter<"LevelUpQuestion"> | string
    difficulty?: StringWithAggregatesFilter<"LevelUpQuestion"> | string
    correctOption?: StringWithAggregatesFilter<"LevelUpQuestion"> | string
    explanation?: StringNullableWithAggregatesFilter<"LevelUpQuestion"> | string | null
    isActive?: BoolWithAggregatesFilter<"LevelUpQuestion"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"LevelUpQuestion"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"LevelUpQuestion"> | Date | string
  }

  export type LevelUpQuestionOptionWhereInput = {
    AND?: LevelUpQuestionOptionWhereInput | LevelUpQuestionOptionWhereInput[]
    OR?: LevelUpQuestionOptionWhereInput[]
    NOT?: LevelUpQuestionOptionWhereInput | LevelUpQuestionOptionWhereInput[]
    id?: StringFilter<"LevelUpQuestionOption"> | string
    questionId?: StringFilter<"LevelUpQuestionOption"> | string
    optionKey?: StringFilter<"LevelUpQuestionOption"> | string
    optionText?: StringFilter<"LevelUpQuestionOption"> | string
    displayOrder?: IntFilter<"LevelUpQuestionOption"> | number
    question?: XOR<LevelUpQuestionRelationFilter, LevelUpQuestionWhereInput>
  }

  export type LevelUpQuestionOptionOrderByWithRelationInput = {
    id?: SortOrder
    questionId?: SortOrder
    optionKey?: SortOrder
    optionText?: SortOrder
    displayOrder?: SortOrder
    question?: LevelUpQuestionOrderByWithRelationInput
  }

  export type LevelUpQuestionOptionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: LevelUpQuestionOptionWhereInput | LevelUpQuestionOptionWhereInput[]
    OR?: LevelUpQuestionOptionWhereInput[]
    NOT?: LevelUpQuestionOptionWhereInput | LevelUpQuestionOptionWhereInput[]
    questionId?: StringFilter<"LevelUpQuestionOption"> | string
    optionKey?: StringFilter<"LevelUpQuestionOption"> | string
    optionText?: StringFilter<"LevelUpQuestionOption"> | string
    displayOrder?: IntFilter<"LevelUpQuestionOption"> | number
    question?: XOR<LevelUpQuestionRelationFilter, LevelUpQuestionWhereInput>
  }, "id">

  export type LevelUpQuestionOptionOrderByWithAggregationInput = {
    id?: SortOrder
    questionId?: SortOrder
    optionKey?: SortOrder
    optionText?: SortOrder
    displayOrder?: SortOrder
    _count?: LevelUpQuestionOptionCountOrderByAggregateInput
    _avg?: LevelUpQuestionOptionAvgOrderByAggregateInput
    _max?: LevelUpQuestionOptionMaxOrderByAggregateInput
    _min?: LevelUpQuestionOptionMinOrderByAggregateInput
    _sum?: LevelUpQuestionOptionSumOrderByAggregateInput
  }

  export type LevelUpQuestionOptionScalarWhereWithAggregatesInput = {
    AND?: LevelUpQuestionOptionScalarWhereWithAggregatesInput | LevelUpQuestionOptionScalarWhereWithAggregatesInput[]
    OR?: LevelUpQuestionOptionScalarWhereWithAggregatesInput[]
    NOT?: LevelUpQuestionOptionScalarWhereWithAggregatesInput | LevelUpQuestionOptionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"LevelUpQuestionOption"> | string
    questionId?: StringWithAggregatesFilter<"LevelUpQuestionOption"> | string
    optionKey?: StringWithAggregatesFilter<"LevelUpQuestionOption"> | string
    optionText?: StringWithAggregatesFilter<"LevelUpQuestionOption"> | string
    displayOrder?: IntWithAggregatesFilter<"LevelUpQuestionOption"> | number
  }

  export type LevelUpPaperWhereInput = {
    AND?: LevelUpPaperWhereInput | LevelUpPaperWhereInput[]
    OR?: LevelUpPaperWhereInput[]
    NOT?: LevelUpPaperWhereInput | LevelUpPaperWhereInput[]
    id?: StringFilter<"LevelUpPaper"> | string
    title?: StringFilter<"LevelUpPaper"> | string
    subjectCode?: StringFilter<"LevelUpPaper"> | string
    classLevel?: StringFilter<"LevelUpPaper"> | string
    durationMinutes?: IntFilter<"LevelUpPaper"> | number
    totalQuestions?: IntFilter<"LevelUpPaper"> | number
    totalMarks?: IntFilter<"LevelUpPaper"> | number
    status?: StringFilter<"LevelUpPaper"> | string
    createdAt?: DateTimeFilter<"LevelUpPaper"> | Date | string
    updatedAt?: DateTimeFilter<"LevelUpPaper"> | Date | string
    subject?: XOR<LevelUpSubjectRelationFilter, LevelUpSubjectWhereInput>
    questions?: LevelUpPaperQuestionListRelationFilter
    publishings?: LevelUpPublishingListRelationFilter
  }

  export type LevelUpPaperOrderByWithRelationInput = {
    id?: SortOrder
    title?: SortOrder
    subjectCode?: SortOrder
    classLevel?: SortOrder
    durationMinutes?: SortOrder
    totalQuestions?: SortOrder
    totalMarks?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    subject?: LevelUpSubjectOrderByWithRelationInput
    questions?: LevelUpPaperQuestionOrderByRelationAggregateInput
    publishings?: LevelUpPublishingOrderByRelationAggregateInput
  }

  export type LevelUpPaperWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: LevelUpPaperWhereInput | LevelUpPaperWhereInput[]
    OR?: LevelUpPaperWhereInput[]
    NOT?: LevelUpPaperWhereInput | LevelUpPaperWhereInput[]
    title?: StringFilter<"LevelUpPaper"> | string
    subjectCode?: StringFilter<"LevelUpPaper"> | string
    classLevel?: StringFilter<"LevelUpPaper"> | string
    durationMinutes?: IntFilter<"LevelUpPaper"> | number
    totalQuestions?: IntFilter<"LevelUpPaper"> | number
    totalMarks?: IntFilter<"LevelUpPaper"> | number
    status?: StringFilter<"LevelUpPaper"> | string
    createdAt?: DateTimeFilter<"LevelUpPaper"> | Date | string
    updatedAt?: DateTimeFilter<"LevelUpPaper"> | Date | string
    subject?: XOR<LevelUpSubjectRelationFilter, LevelUpSubjectWhereInput>
    questions?: LevelUpPaperQuestionListRelationFilter
    publishings?: LevelUpPublishingListRelationFilter
  }, "id">

  export type LevelUpPaperOrderByWithAggregationInput = {
    id?: SortOrder
    title?: SortOrder
    subjectCode?: SortOrder
    classLevel?: SortOrder
    durationMinutes?: SortOrder
    totalQuestions?: SortOrder
    totalMarks?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: LevelUpPaperCountOrderByAggregateInput
    _avg?: LevelUpPaperAvgOrderByAggregateInput
    _max?: LevelUpPaperMaxOrderByAggregateInput
    _min?: LevelUpPaperMinOrderByAggregateInput
    _sum?: LevelUpPaperSumOrderByAggregateInput
  }

  export type LevelUpPaperScalarWhereWithAggregatesInput = {
    AND?: LevelUpPaperScalarWhereWithAggregatesInput | LevelUpPaperScalarWhereWithAggregatesInput[]
    OR?: LevelUpPaperScalarWhereWithAggregatesInput[]
    NOT?: LevelUpPaperScalarWhereWithAggregatesInput | LevelUpPaperScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"LevelUpPaper"> | string
    title?: StringWithAggregatesFilter<"LevelUpPaper"> | string
    subjectCode?: StringWithAggregatesFilter<"LevelUpPaper"> | string
    classLevel?: StringWithAggregatesFilter<"LevelUpPaper"> | string
    durationMinutes?: IntWithAggregatesFilter<"LevelUpPaper"> | number
    totalQuestions?: IntWithAggregatesFilter<"LevelUpPaper"> | number
    totalMarks?: IntWithAggregatesFilter<"LevelUpPaper"> | number
    status?: StringWithAggregatesFilter<"LevelUpPaper"> | string
    createdAt?: DateTimeWithAggregatesFilter<"LevelUpPaper"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"LevelUpPaper"> | Date | string
  }

  export type LevelUpPaperQuestionWhereInput = {
    AND?: LevelUpPaperQuestionWhereInput | LevelUpPaperQuestionWhereInput[]
    OR?: LevelUpPaperQuestionWhereInput[]
    NOT?: LevelUpPaperQuestionWhereInput | LevelUpPaperQuestionWhereInput[]
    id?: StringFilter<"LevelUpPaperQuestion"> | string
    paperId?: StringFilter<"LevelUpPaperQuestion"> | string
    questionId?: StringFilter<"LevelUpPaperQuestion"> | string
    displayOrder?: IntFilter<"LevelUpPaperQuestion"> | number
    marks?: IntFilter<"LevelUpPaperQuestion"> | number
    paper?: XOR<LevelUpPaperRelationFilter, LevelUpPaperWhereInput>
    question?: XOR<LevelUpQuestionRelationFilter, LevelUpQuestionWhereInput>
  }

  export type LevelUpPaperQuestionOrderByWithRelationInput = {
    id?: SortOrder
    paperId?: SortOrder
    questionId?: SortOrder
    displayOrder?: SortOrder
    marks?: SortOrder
    paper?: LevelUpPaperOrderByWithRelationInput
    question?: LevelUpQuestionOrderByWithRelationInput
  }

  export type LevelUpPaperQuestionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: LevelUpPaperQuestionWhereInput | LevelUpPaperQuestionWhereInput[]
    OR?: LevelUpPaperQuestionWhereInput[]
    NOT?: LevelUpPaperQuestionWhereInput | LevelUpPaperQuestionWhereInput[]
    paperId?: StringFilter<"LevelUpPaperQuestion"> | string
    questionId?: StringFilter<"LevelUpPaperQuestion"> | string
    displayOrder?: IntFilter<"LevelUpPaperQuestion"> | number
    marks?: IntFilter<"LevelUpPaperQuestion"> | number
    paper?: XOR<LevelUpPaperRelationFilter, LevelUpPaperWhereInput>
    question?: XOR<LevelUpQuestionRelationFilter, LevelUpQuestionWhereInput>
  }, "id">

  export type LevelUpPaperQuestionOrderByWithAggregationInput = {
    id?: SortOrder
    paperId?: SortOrder
    questionId?: SortOrder
    displayOrder?: SortOrder
    marks?: SortOrder
    _count?: LevelUpPaperQuestionCountOrderByAggregateInput
    _avg?: LevelUpPaperQuestionAvgOrderByAggregateInput
    _max?: LevelUpPaperQuestionMaxOrderByAggregateInput
    _min?: LevelUpPaperQuestionMinOrderByAggregateInput
    _sum?: LevelUpPaperQuestionSumOrderByAggregateInput
  }

  export type LevelUpPaperQuestionScalarWhereWithAggregatesInput = {
    AND?: LevelUpPaperQuestionScalarWhereWithAggregatesInput | LevelUpPaperQuestionScalarWhereWithAggregatesInput[]
    OR?: LevelUpPaperQuestionScalarWhereWithAggregatesInput[]
    NOT?: LevelUpPaperQuestionScalarWhereWithAggregatesInput | LevelUpPaperQuestionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"LevelUpPaperQuestion"> | string
    paperId?: StringWithAggregatesFilter<"LevelUpPaperQuestion"> | string
    questionId?: StringWithAggregatesFilter<"LevelUpPaperQuestion"> | string
    displayOrder?: IntWithAggregatesFilter<"LevelUpPaperQuestion"> | number
    marks?: IntWithAggregatesFilter<"LevelUpPaperQuestion"> | number
  }

  export type LevelUpPublishingWhereInput = {
    AND?: LevelUpPublishingWhereInput | LevelUpPublishingWhereInput[]
    OR?: LevelUpPublishingWhereInput[]
    NOT?: LevelUpPublishingWhereInput | LevelUpPublishingWhereInput[]
    id?: StringFilter<"LevelUpPublishing"> | string
    slug?: StringFilter<"LevelUpPublishing"> | string
    title?: StringFilter<"LevelUpPublishing"> | string
    paperId?: StringFilter<"LevelUpPublishing"> | string
    classLevel?: StringFilter<"LevelUpPublishing"> | string
    subjectCode?: StringFilter<"LevelUpPublishing"> | string
    durationMinutes?: IntFilter<"LevelUpPublishing"> | number
    startAt?: DateTimeFilter<"LevelUpPublishing"> | Date | string
    endAt?: DateTimeFilter<"LevelUpPublishing"> | Date | string
    isActive?: BoolFilter<"LevelUpPublishing"> | boolean
    createdAt?: DateTimeFilter<"LevelUpPublishing"> | Date | string
    paper?: XOR<LevelUpPaperRelationFilter, LevelUpPaperWhereInput>
    subject?: XOR<LevelUpSubjectRelationFilter, LevelUpSubjectWhereInput>
    attempts?: LevelUpAttemptListRelationFilter
  }

  export type LevelUpPublishingOrderByWithRelationInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    paperId?: SortOrder
    classLevel?: SortOrder
    subjectCode?: SortOrder
    durationMinutes?: SortOrder
    startAt?: SortOrder
    endAt?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    paper?: LevelUpPaperOrderByWithRelationInput
    subject?: LevelUpSubjectOrderByWithRelationInput
    attempts?: LevelUpAttemptOrderByRelationAggregateInput
  }

  export type LevelUpPublishingWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    slug?: string
    AND?: LevelUpPublishingWhereInput | LevelUpPublishingWhereInput[]
    OR?: LevelUpPublishingWhereInput[]
    NOT?: LevelUpPublishingWhereInput | LevelUpPublishingWhereInput[]
    title?: StringFilter<"LevelUpPublishing"> | string
    paperId?: StringFilter<"LevelUpPublishing"> | string
    classLevel?: StringFilter<"LevelUpPublishing"> | string
    subjectCode?: StringFilter<"LevelUpPublishing"> | string
    durationMinutes?: IntFilter<"LevelUpPublishing"> | number
    startAt?: DateTimeFilter<"LevelUpPublishing"> | Date | string
    endAt?: DateTimeFilter<"LevelUpPublishing"> | Date | string
    isActive?: BoolFilter<"LevelUpPublishing"> | boolean
    createdAt?: DateTimeFilter<"LevelUpPublishing"> | Date | string
    paper?: XOR<LevelUpPaperRelationFilter, LevelUpPaperWhereInput>
    subject?: XOR<LevelUpSubjectRelationFilter, LevelUpSubjectWhereInput>
    attempts?: LevelUpAttemptListRelationFilter
  }, "id" | "slug">

  export type LevelUpPublishingOrderByWithAggregationInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    paperId?: SortOrder
    classLevel?: SortOrder
    subjectCode?: SortOrder
    durationMinutes?: SortOrder
    startAt?: SortOrder
    endAt?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    _count?: LevelUpPublishingCountOrderByAggregateInput
    _avg?: LevelUpPublishingAvgOrderByAggregateInput
    _max?: LevelUpPublishingMaxOrderByAggregateInput
    _min?: LevelUpPublishingMinOrderByAggregateInput
    _sum?: LevelUpPublishingSumOrderByAggregateInput
  }

  export type LevelUpPublishingScalarWhereWithAggregatesInput = {
    AND?: LevelUpPublishingScalarWhereWithAggregatesInput | LevelUpPublishingScalarWhereWithAggregatesInput[]
    OR?: LevelUpPublishingScalarWhereWithAggregatesInput[]
    NOT?: LevelUpPublishingScalarWhereWithAggregatesInput | LevelUpPublishingScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"LevelUpPublishing"> | string
    slug?: StringWithAggregatesFilter<"LevelUpPublishing"> | string
    title?: StringWithAggregatesFilter<"LevelUpPublishing"> | string
    paperId?: StringWithAggregatesFilter<"LevelUpPublishing"> | string
    classLevel?: StringWithAggregatesFilter<"LevelUpPublishing"> | string
    subjectCode?: StringWithAggregatesFilter<"LevelUpPublishing"> | string
    durationMinutes?: IntWithAggregatesFilter<"LevelUpPublishing"> | number
    startAt?: DateTimeWithAggregatesFilter<"LevelUpPublishing"> | Date | string
    endAt?: DateTimeWithAggregatesFilter<"LevelUpPublishing"> | Date | string
    isActive?: BoolWithAggregatesFilter<"LevelUpPublishing"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"LevelUpPublishing"> | Date | string
  }

  export type LevelUpRegistrationWhereInput = {
    AND?: LevelUpRegistrationWhereInput | LevelUpRegistrationWhereInput[]
    OR?: LevelUpRegistrationWhereInput[]
    NOT?: LevelUpRegistrationWhereInput | LevelUpRegistrationWhereInput[]
    id?: StringFilter<"LevelUpRegistration"> | string
    studentName?: StringFilter<"LevelUpRegistration"> | string
    email?: StringNullableFilter<"LevelUpRegistration"> | string | null
    schoolName?: StringNullableFilter<"LevelUpRegistration"> | string | null
    phone?: StringFilter<"LevelUpRegistration"> | string
    country?: StringFilter<"LevelUpRegistration"> | string
    emirateCity?: StringNullableFilter<"LevelUpRegistration"> | string | null
    classLevel?: StringFilter<"LevelUpRegistration"> | string
    curriculum?: StringNullableFilter<"LevelUpRegistration"> | string | null
    status?: StringFilter<"LevelUpRegistration"> | string
    attemptId?: StringNullableFilter<"LevelUpRegistration"> | string | null
    createdAt?: DateTimeFilter<"LevelUpRegistration"> | Date | string
    updatedAt?: DateTimeFilter<"LevelUpRegistration"> | Date | string
  }

  export type LevelUpRegistrationOrderByWithRelationInput = {
    id?: SortOrder
    studentName?: SortOrder
    email?: SortOrderInput | SortOrder
    schoolName?: SortOrderInput | SortOrder
    phone?: SortOrder
    country?: SortOrder
    emirateCity?: SortOrderInput | SortOrder
    classLevel?: SortOrder
    curriculum?: SortOrderInput | SortOrder
    status?: SortOrder
    attemptId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type LevelUpRegistrationWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: LevelUpRegistrationWhereInput | LevelUpRegistrationWhereInput[]
    OR?: LevelUpRegistrationWhereInput[]
    NOT?: LevelUpRegistrationWhereInput | LevelUpRegistrationWhereInput[]
    studentName?: StringFilter<"LevelUpRegistration"> | string
    email?: StringNullableFilter<"LevelUpRegistration"> | string | null
    schoolName?: StringNullableFilter<"LevelUpRegistration"> | string | null
    phone?: StringFilter<"LevelUpRegistration"> | string
    country?: StringFilter<"LevelUpRegistration"> | string
    emirateCity?: StringNullableFilter<"LevelUpRegistration"> | string | null
    classLevel?: StringFilter<"LevelUpRegistration"> | string
    curriculum?: StringNullableFilter<"LevelUpRegistration"> | string | null
    status?: StringFilter<"LevelUpRegistration"> | string
    attemptId?: StringNullableFilter<"LevelUpRegistration"> | string | null
    createdAt?: DateTimeFilter<"LevelUpRegistration"> | Date | string
    updatedAt?: DateTimeFilter<"LevelUpRegistration"> | Date | string
  }, "id">

  export type LevelUpRegistrationOrderByWithAggregationInput = {
    id?: SortOrder
    studentName?: SortOrder
    email?: SortOrderInput | SortOrder
    schoolName?: SortOrderInput | SortOrder
    phone?: SortOrder
    country?: SortOrder
    emirateCity?: SortOrderInput | SortOrder
    classLevel?: SortOrder
    curriculum?: SortOrderInput | SortOrder
    status?: SortOrder
    attemptId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: LevelUpRegistrationCountOrderByAggregateInput
    _max?: LevelUpRegistrationMaxOrderByAggregateInput
    _min?: LevelUpRegistrationMinOrderByAggregateInput
  }

  export type LevelUpRegistrationScalarWhereWithAggregatesInput = {
    AND?: LevelUpRegistrationScalarWhereWithAggregatesInput | LevelUpRegistrationScalarWhereWithAggregatesInput[]
    OR?: LevelUpRegistrationScalarWhereWithAggregatesInput[]
    NOT?: LevelUpRegistrationScalarWhereWithAggregatesInput | LevelUpRegistrationScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"LevelUpRegistration"> | string
    studentName?: StringWithAggregatesFilter<"LevelUpRegistration"> | string
    email?: StringNullableWithAggregatesFilter<"LevelUpRegistration"> | string | null
    schoolName?: StringNullableWithAggregatesFilter<"LevelUpRegistration"> | string | null
    phone?: StringWithAggregatesFilter<"LevelUpRegistration"> | string
    country?: StringWithAggregatesFilter<"LevelUpRegistration"> | string
    emirateCity?: StringNullableWithAggregatesFilter<"LevelUpRegistration"> | string | null
    classLevel?: StringWithAggregatesFilter<"LevelUpRegistration"> | string
    curriculum?: StringNullableWithAggregatesFilter<"LevelUpRegistration"> | string | null
    status?: StringWithAggregatesFilter<"LevelUpRegistration"> | string
    attemptId?: StringNullableWithAggregatesFilter<"LevelUpRegistration"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"LevelUpRegistration"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"LevelUpRegistration"> | Date | string
  }

  export type LevelUpAttemptWhereInput = {
    AND?: LevelUpAttemptWhereInput | LevelUpAttemptWhereInput[]
    OR?: LevelUpAttemptWhereInput[]
    NOT?: LevelUpAttemptWhereInput | LevelUpAttemptWhereInput[]
    id?: StringFilter<"LevelUpAttempt"> | string
    publishingId?: StringFilter<"LevelUpAttempt"> | string
    studentName?: StringFilter<"LevelUpAttempt"> | string
    email?: StringNullableFilter<"LevelUpAttempt"> | string | null
    schoolName?: StringNullableFilter<"LevelUpAttempt"> | string | null
    studentPhone?: StringNullableFilter<"LevelUpAttempt"> | string | null
    country?: StringNullableFilter<"LevelUpAttempt"> | string | null
    emirateCity?: StringNullableFilter<"LevelUpAttempt"> | string | null
    classLevel?: StringFilter<"LevelUpAttempt"> | string
    curriculum?: StringNullableFilter<"LevelUpAttempt"> | string | null
    status?: StringFilter<"LevelUpAttempt"> | string
    startedAt?: DateTimeFilter<"LevelUpAttempt"> | Date | string
    submittedAt?: DateTimeNullableFilter<"LevelUpAttempt"> | Date | string | null
    scoreObtained?: IntFilter<"LevelUpAttempt"> | number
    totalMarks?: IntFilter<"LevelUpAttempt"> | number
    percentage?: IntFilter<"LevelUpAttempt"> | number
    correctCount?: IntFilter<"LevelUpAttempt"> | number
    wrongCount?: IntFilter<"LevelUpAttempt"> | number
    unansweredCount?: IntFilter<"LevelUpAttempt"> | number
    paperSnapshotJson?: JsonFilter<"LevelUpAttempt">
    resultSnapshotJson?: JsonNullableFilter<"LevelUpAttempt">
    sessionTokenHash?: StringFilter<"LevelUpAttempt"> | string
    createdAt?: DateTimeFilter<"LevelUpAttempt"> | Date | string
    updatedAt?: DateTimeFilter<"LevelUpAttempt"> | Date | string
    publishing?: XOR<LevelUpPublishingRelationFilter, LevelUpPublishingWhereInput>
    answers?: LevelUpAttemptAnswerListRelationFilter
  }

  export type LevelUpAttemptOrderByWithRelationInput = {
    id?: SortOrder
    publishingId?: SortOrder
    studentName?: SortOrder
    email?: SortOrderInput | SortOrder
    schoolName?: SortOrderInput | SortOrder
    studentPhone?: SortOrderInput | SortOrder
    country?: SortOrderInput | SortOrder
    emirateCity?: SortOrderInput | SortOrder
    classLevel?: SortOrder
    curriculum?: SortOrderInput | SortOrder
    status?: SortOrder
    startedAt?: SortOrder
    submittedAt?: SortOrderInput | SortOrder
    scoreObtained?: SortOrder
    totalMarks?: SortOrder
    percentage?: SortOrder
    correctCount?: SortOrder
    wrongCount?: SortOrder
    unansweredCount?: SortOrder
    paperSnapshotJson?: SortOrder
    resultSnapshotJson?: SortOrderInput | SortOrder
    sessionTokenHash?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    publishing?: LevelUpPublishingOrderByWithRelationInput
    answers?: LevelUpAttemptAnswerOrderByRelationAggregateInput
  }

  export type LevelUpAttemptWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: LevelUpAttemptWhereInput | LevelUpAttemptWhereInput[]
    OR?: LevelUpAttemptWhereInput[]
    NOT?: LevelUpAttemptWhereInput | LevelUpAttemptWhereInput[]
    publishingId?: StringFilter<"LevelUpAttempt"> | string
    studentName?: StringFilter<"LevelUpAttempt"> | string
    email?: StringNullableFilter<"LevelUpAttempt"> | string | null
    schoolName?: StringNullableFilter<"LevelUpAttempt"> | string | null
    studentPhone?: StringNullableFilter<"LevelUpAttempt"> | string | null
    country?: StringNullableFilter<"LevelUpAttempt"> | string | null
    emirateCity?: StringNullableFilter<"LevelUpAttempt"> | string | null
    classLevel?: StringFilter<"LevelUpAttempt"> | string
    curriculum?: StringNullableFilter<"LevelUpAttempt"> | string | null
    status?: StringFilter<"LevelUpAttempt"> | string
    startedAt?: DateTimeFilter<"LevelUpAttempt"> | Date | string
    submittedAt?: DateTimeNullableFilter<"LevelUpAttempt"> | Date | string | null
    scoreObtained?: IntFilter<"LevelUpAttempt"> | number
    totalMarks?: IntFilter<"LevelUpAttempt"> | number
    percentage?: IntFilter<"LevelUpAttempt"> | number
    correctCount?: IntFilter<"LevelUpAttempt"> | number
    wrongCount?: IntFilter<"LevelUpAttempt"> | number
    unansweredCount?: IntFilter<"LevelUpAttempt"> | number
    paperSnapshotJson?: JsonFilter<"LevelUpAttempt">
    resultSnapshotJson?: JsonNullableFilter<"LevelUpAttempt">
    sessionTokenHash?: StringFilter<"LevelUpAttempt"> | string
    createdAt?: DateTimeFilter<"LevelUpAttempt"> | Date | string
    updatedAt?: DateTimeFilter<"LevelUpAttempt"> | Date | string
    publishing?: XOR<LevelUpPublishingRelationFilter, LevelUpPublishingWhereInput>
    answers?: LevelUpAttemptAnswerListRelationFilter
  }, "id">

  export type LevelUpAttemptOrderByWithAggregationInput = {
    id?: SortOrder
    publishingId?: SortOrder
    studentName?: SortOrder
    email?: SortOrderInput | SortOrder
    schoolName?: SortOrderInput | SortOrder
    studentPhone?: SortOrderInput | SortOrder
    country?: SortOrderInput | SortOrder
    emirateCity?: SortOrderInput | SortOrder
    classLevel?: SortOrder
    curriculum?: SortOrderInput | SortOrder
    status?: SortOrder
    startedAt?: SortOrder
    submittedAt?: SortOrderInput | SortOrder
    scoreObtained?: SortOrder
    totalMarks?: SortOrder
    percentage?: SortOrder
    correctCount?: SortOrder
    wrongCount?: SortOrder
    unansweredCount?: SortOrder
    paperSnapshotJson?: SortOrder
    resultSnapshotJson?: SortOrderInput | SortOrder
    sessionTokenHash?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: LevelUpAttemptCountOrderByAggregateInput
    _avg?: LevelUpAttemptAvgOrderByAggregateInput
    _max?: LevelUpAttemptMaxOrderByAggregateInput
    _min?: LevelUpAttemptMinOrderByAggregateInput
    _sum?: LevelUpAttemptSumOrderByAggregateInput
  }

  export type LevelUpAttemptScalarWhereWithAggregatesInput = {
    AND?: LevelUpAttemptScalarWhereWithAggregatesInput | LevelUpAttemptScalarWhereWithAggregatesInput[]
    OR?: LevelUpAttemptScalarWhereWithAggregatesInput[]
    NOT?: LevelUpAttemptScalarWhereWithAggregatesInput | LevelUpAttemptScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"LevelUpAttempt"> | string
    publishingId?: StringWithAggregatesFilter<"LevelUpAttempt"> | string
    studentName?: StringWithAggregatesFilter<"LevelUpAttempt"> | string
    email?: StringNullableWithAggregatesFilter<"LevelUpAttempt"> | string | null
    schoolName?: StringNullableWithAggregatesFilter<"LevelUpAttempt"> | string | null
    studentPhone?: StringNullableWithAggregatesFilter<"LevelUpAttempt"> | string | null
    country?: StringNullableWithAggregatesFilter<"LevelUpAttempt"> | string | null
    emirateCity?: StringNullableWithAggregatesFilter<"LevelUpAttempt"> | string | null
    classLevel?: StringWithAggregatesFilter<"LevelUpAttempt"> | string
    curriculum?: StringNullableWithAggregatesFilter<"LevelUpAttempt"> | string | null
    status?: StringWithAggregatesFilter<"LevelUpAttempt"> | string
    startedAt?: DateTimeWithAggregatesFilter<"LevelUpAttempt"> | Date | string
    submittedAt?: DateTimeNullableWithAggregatesFilter<"LevelUpAttempt"> | Date | string | null
    scoreObtained?: IntWithAggregatesFilter<"LevelUpAttempt"> | number
    totalMarks?: IntWithAggregatesFilter<"LevelUpAttempt"> | number
    percentage?: IntWithAggregatesFilter<"LevelUpAttempt"> | number
    correctCount?: IntWithAggregatesFilter<"LevelUpAttempt"> | number
    wrongCount?: IntWithAggregatesFilter<"LevelUpAttempt"> | number
    unansweredCount?: IntWithAggregatesFilter<"LevelUpAttempt"> | number
    paperSnapshotJson?: JsonWithAggregatesFilter<"LevelUpAttempt">
    resultSnapshotJson?: JsonNullableWithAggregatesFilter<"LevelUpAttempt">
    sessionTokenHash?: StringWithAggregatesFilter<"LevelUpAttempt"> | string
    createdAt?: DateTimeWithAggregatesFilter<"LevelUpAttempt"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"LevelUpAttempt"> | Date | string
  }

  export type LevelUpAttemptAnswerWhereInput = {
    AND?: LevelUpAttemptAnswerWhereInput | LevelUpAttemptAnswerWhereInput[]
    OR?: LevelUpAttemptAnswerWhereInput[]
    NOT?: LevelUpAttemptAnswerWhereInput | LevelUpAttemptAnswerWhereInput[]
    id?: StringFilter<"LevelUpAttemptAnswer"> | string
    attemptId?: StringFilter<"LevelUpAttemptAnswer"> | string
    questionId?: StringFilter<"LevelUpAttemptAnswer"> | string
    selectedOption?: StringFilter<"LevelUpAttemptAnswer"> | string
    answeredAt?: DateTimeFilter<"LevelUpAttemptAnswer"> | Date | string
    attempt?: XOR<LevelUpAttemptRelationFilter, LevelUpAttemptWhereInput>
  }

  export type LevelUpAttemptAnswerOrderByWithRelationInput = {
    id?: SortOrder
    attemptId?: SortOrder
    questionId?: SortOrder
    selectedOption?: SortOrder
    answeredAt?: SortOrder
    attempt?: LevelUpAttemptOrderByWithRelationInput
  }

  export type LevelUpAttemptAnswerWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    attemptId_questionId?: LevelUpAttemptAnswerAttemptIdQuestionIdCompoundUniqueInput
    AND?: LevelUpAttemptAnswerWhereInput | LevelUpAttemptAnswerWhereInput[]
    OR?: LevelUpAttemptAnswerWhereInput[]
    NOT?: LevelUpAttemptAnswerWhereInput | LevelUpAttemptAnswerWhereInput[]
    attemptId?: StringFilter<"LevelUpAttemptAnswer"> | string
    questionId?: StringFilter<"LevelUpAttemptAnswer"> | string
    selectedOption?: StringFilter<"LevelUpAttemptAnswer"> | string
    answeredAt?: DateTimeFilter<"LevelUpAttemptAnswer"> | Date | string
    attempt?: XOR<LevelUpAttemptRelationFilter, LevelUpAttemptWhereInput>
  }, "id" | "attemptId_questionId">

  export type LevelUpAttemptAnswerOrderByWithAggregationInput = {
    id?: SortOrder
    attemptId?: SortOrder
    questionId?: SortOrder
    selectedOption?: SortOrder
    answeredAt?: SortOrder
    _count?: LevelUpAttemptAnswerCountOrderByAggregateInput
    _max?: LevelUpAttemptAnswerMaxOrderByAggregateInput
    _min?: LevelUpAttemptAnswerMinOrderByAggregateInput
  }

  export type LevelUpAttemptAnswerScalarWhereWithAggregatesInput = {
    AND?: LevelUpAttemptAnswerScalarWhereWithAggregatesInput | LevelUpAttemptAnswerScalarWhereWithAggregatesInput[]
    OR?: LevelUpAttemptAnswerScalarWhereWithAggregatesInput[]
    NOT?: LevelUpAttemptAnswerScalarWhereWithAggregatesInput | LevelUpAttemptAnswerScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"LevelUpAttemptAnswer"> | string
    attemptId?: StringWithAggregatesFilter<"LevelUpAttemptAnswer"> | string
    questionId?: StringWithAggregatesFilter<"LevelUpAttemptAnswer"> | string
    selectedOption?: StringWithAggregatesFilter<"LevelUpAttemptAnswer"> | string
    answeredAt?: DateTimeWithAggregatesFilter<"LevelUpAttemptAnswer"> | Date | string
  }

  export type LevelUpSubjectCreateInput = {
    code: string
    name: string
    createdAt?: Date | string
    questions?: LevelUpQuestionCreateNestedManyWithoutSubjectInput
    papers?: LevelUpPaperCreateNestedManyWithoutSubjectInput
    publishings?: LevelUpPublishingCreateNestedManyWithoutSubjectInput
  }

  export type LevelUpSubjectUncheckedCreateInput = {
    code: string
    name: string
    createdAt?: Date | string
    questions?: LevelUpQuestionUncheckedCreateNestedManyWithoutSubjectInput
    papers?: LevelUpPaperUncheckedCreateNestedManyWithoutSubjectInput
    publishings?: LevelUpPublishingUncheckedCreateNestedManyWithoutSubjectInput
  }

  export type LevelUpSubjectUpdateInput = {
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    questions?: LevelUpQuestionUpdateManyWithoutSubjectNestedInput
    papers?: LevelUpPaperUpdateManyWithoutSubjectNestedInput
    publishings?: LevelUpPublishingUpdateManyWithoutSubjectNestedInput
  }

  export type LevelUpSubjectUncheckedUpdateInput = {
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    questions?: LevelUpQuestionUncheckedUpdateManyWithoutSubjectNestedInput
    papers?: LevelUpPaperUncheckedUpdateManyWithoutSubjectNestedInput
    publishings?: LevelUpPublishingUncheckedUpdateManyWithoutSubjectNestedInput
  }

  export type LevelUpSubjectCreateManyInput = {
    code: string
    name: string
    createdAt?: Date | string
  }

  export type LevelUpSubjectUpdateManyMutationInput = {
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpSubjectUncheckedUpdateManyInput = {
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpQuestionCreateInput = {
    id?: string
    classLevel: string
    questionText: string
    difficulty?: string
    correctOption: string
    explanation?: string | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    subject: LevelUpSubjectCreateNestedOneWithoutQuestionsInput
    options?: LevelUpQuestionOptionCreateNestedManyWithoutQuestionInput
    paperLinks?: LevelUpPaperQuestionCreateNestedManyWithoutQuestionInput
  }

  export type LevelUpQuestionUncheckedCreateInput = {
    id?: string
    subjectCode: string
    classLevel: string
    questionText: string
    difficulty?: string
    correctOption: string
    explanation?: string | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    options?: LevelUpQuestionOptionUncheckedCreateNestedManyWithoutQuestionInput
    paperLinks?: LevelUpPaperQuestionUncheckedCreateNestedManyWithoutQuestionInput
  }

  export type LevelUpQuestionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    questionText?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    correctOption?: StringFieldUpdateOperationsInput | string
    explanation?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subject?: LevelUpSubjectUpdateOneRequiredWithoutQuestionsNestedInput
    options?: LevelUpQuestionOptionUpdateManyWithoutQuestionNestedInput
    paperLinks?: LevelUpPaperQuestionUpdateManyWithoutQuestionNestedInput
  }

  export type LevelUpQuestionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    subjectCode?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    questionText?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    correctOption?: StringFieldUpdateOperationsInput | string
    explanation?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    options?: LevelUpQuestionOptionUncheckedUpdateManyWithoutQuestionNestedInput
    paperLinks?: LevelUpPaperQuestionUncheckedUpdateManyWithoutQuestionNestedInput
  }

  export type LevelUpQuestionCreateManyInput = {
    id?: string
    subjectCode: string
    classLevel: string
    questionText: string
    difficulty?: string
    correctOption: string
    explanation?: string | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type LevelUpQuestionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    questionText?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    correctOption?: StringFieldUpdateOperationsInput | string
    explanation?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpQuestionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    subjectCode?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    questionText?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    correctOption?: StringFieldUpdateOperationsInput | string
    explanation?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpQuestionOptionCreateInput = {
    id?: string
    optionKey: string
    optionText: string
    displayOrder: number
    question: LevelUpQuestionCreateNestedOneWithoutOptionsInput
  }

  export type LevelUpQuestionOptionUncheckedCreateInput = {
    id?: string
    questionId: string
    optionKey: string
    optionText: string
    displayOrder: number
  }

  export type LevelUpQuestionOptionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    optionKey?: StringFieldUpdateOperationsInput | string
    optionText?: StringFieldUpdateOperationsInput | string
    displayOrder?: IntFieldUpdateOperationsInput | number
    question?: LevelUpQuestionUpdateOneRequiredWithoutOptionsNestedInput
  }

  export type LevelUpQuestionOptionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    questionId?: StringFieldUpdateOperationsInput | string
    optionKey?: StringFieldUpdateOperationsInput | string
    optionText?: StringFieldUpdateOperationsInput | string
    displayOrder?: IntFieldUpdateOperationsInput | number
  }

  export type LevelUpQuestionOptionCreateManyInput = {
    id?: string
    questionId: string
    optionKey: string
    optionText: string
    displayOrder: number
  }

  export type LevelUpQuestionOptionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    optionKey?: StringFieldUpdateOperationsInput | string
    optionText?: StringFieldUpdateOperationsInput | string
    displayOrder?: IntFieldUpdateOperationsInput | number
  }

  export type LevelUpQuestionOptionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    questionId?: StringFieldUpdateOperationsInput | string
    optionKey?: StringFieldUpdateOperationsInput | string
    optionText?: StringFieldUpdateOperationsInput | string
    displayOrder?: IntFieldUpdateOperationsInput | number
  }

  export type LevelUpPaperCreateInput = {
    id?: string
    title: string
    classLevel: string
    durationMinutes?: number
    totalQuestions?: number
    totalMarks?: number
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    subject: LevelUpSubjectCreateNestedOneWithoutPapersInput
    questions?: LevelUpPaperQuestionCreateNestedManyWithoutPaperInput
    publishings?: LevelUpPublishingCreateNestedManyWithoutPaperInput
  }

  export type LevelUpPaperUncheckedCreateInput = {
    id?: string
    title: string
    subjectCode: string
    classLevel: string
    durationMinutes?: number
    totalQuestions?: number
    totalMarks?: number
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    questions?: LevelUpPaperQuestionUncheckedCreateNestedManyWithoutPaperInput
    publishings?: LevelUpPublishingUncheckedCreateNestedManyWithoutPaperInput
  }

  export type LevelUpPaperUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    totalQuestions?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subject?: LevelUpSubjectUpdateOneRequiredWithoutPapersNestedInput
    questions?: LevelUpPaperQuestionUpdateManyWithoutPaperNestedInput
    publishings?: LevelUpPublishingUpdateManyWithoutPaperNestedInput
  }

  export type LevelUpPaperUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    subjectCode?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    totalQuestions?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    questions?: LevelUpPaperQuestionUncheckedUpdateManyWithoutPaperNestedInput
    publishings?: LevelUpPublishingUncheckedUpdateManyWithoutPaperNestedInput
  }

  export type LevelUpPaperCreateManyInput = {
    id?: string
    title: string
    subjectCode: string
    classLevel: string
    durationMinutes?: number
    totalQuestions?: number
    totalMarks?: number
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type LevelUpPaperUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    totalQuestions?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpPaperUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    subjectCode?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    totalQuestions?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpPaperQuestionCreateInput = {
    id?: string
    displayOrder: number
    marks?: number
    paper: LevelUpPaperCreateNestedOneWithoutQuestionsInput
    question: LevelUpQuestionCreateNestedOneWithoutPaperLinksInput
  }

  export type LevelUpPaperQuestionUncheckedCreateInput = {
    id?: string
    paperId: string
    questionId: string
    displayOrder: number
    marks?: number
  }

  export type LevelUpPaperQuestionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    displayOrder?: IntFieldUpdateOperationsInput | number
    marks?: IntFieldUpdateOperationsInput | number
    paper?: LevelUpPaperUpdateOneRequiredWithoutQuestionsNestedInput
    question?: LevelUpQuestionUpdateOneRequiredWithoutPaperLinksNestedInput
  }

  export type LevelUpPaperQuestionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    paperId?: StringFieldUpdateOperationsInput | string
    questionId?: StringFieldUpdateOperationsInput | string
    displayOrder?: IntFieldUpdateOperationsInput | number
    marks?: IntFieldUpdateOperationsInput | number
  }

  export type LevelUpPaperQuestionCreateManyInput = {
    id?: string
    paperId: string
    questionId: string
    displayOrder: number
    marks?: number
  }

  export type LevelUpPaperQuestionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    displayOrder?: IntFieldUpdateOperationsInput | number
    marks?: IntFieldUpdateOperationsInput | number
  }

  export type LevelUpPaperQuestionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    paperId?: StringFieldUpdateOperationsInput | string
    questionId?: StringFieldUpdateOperationsInput | string
    displayOrder?: IntFieldUpdateOperationsInput | number
    marks?: IntFieldUpdateOperationsInput | number
  }

  export type LevelUpPublishingCreateInput = {
    id?: string
    slug: string
    title: string
    classLevel: string
    durationMinutes: number
    startAt: Date | string
    endAt: Date | string
    isActive?: boolean
    createdAt?: Date | string
    paper: LevelUpPaperCreateNestedOneWithoutPublishingsInput
    subject: LevelUpSubjectCreateNestedOneWithoutPublishingsInput
    attempts?: LevelUpAttemptCreateNestedManyWithoutPublishingInput
  }

  export type LevelUpPublishingUncheckedCreateInput = {
    id?: string
    slug: string
    title: string
    paperId: string
    classLevel: string
    subjectCode: string
    durationMinutes: number
    startAt: Date | string
    endAt: Date | string
    isActive?: boolean
    createdAt?: Date | string
    attempts?: LevelUpAttemptUncheckedCreateNestedManyWithoutPublishingInput
  }

  export type LevelUpPublishingUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    paper?: LevelUpPaperUpdateOneRequiredWithoutPublishingsNestedInput
    subject?: LevelUpSubjectUpdateOneRequiredWithoutPublishingsNestedInput
    attempts?: LevelUpAttemptUpdateManyWithoutPublishingNestedInput
  }

  export type LevelUpPublishingUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    paperId?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    subjectCode?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attempts?: LevelUpAttemptUncheckedUpdateManyWithoutPublishingNestedInput
  }

  export type LevelUpPublishingCreateManyInput = {
    id?: string
    slug: string
    title: string
    paperId: string
    classLevel: string
    subjectCode: string
    durationMinutes: number
    startAt: Date | string
    endAt: Date | string
    isActive?: boolean
    createdAt?: Date | string
  }

  export type LevelUpPublishingUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpPublishingUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    paperId?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    subjectCode?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpRegistrationCreateInput = {
    id?: string
    studentName: string
    email?: string | null
    schoolName?: string | null
    phone: string
    country: string
    emirateCity?: string | null
    classLevel: string
    curriculum?: string | null
    status?: string
    attemptId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type LevelUpRegistrationUncheckedCreateInput = {
    id?: string
    studentName: string
    email?: string | null
    schoolName?: string | null
    phone: string
    country: string
    emirateCity?: string | null
    classLevel: string
    curriculum?: string | null
    status?: string
    attemptId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type LevelUpRegistrationUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    schoolName?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: StringFieldUpdateOperationsInput | string
    country?: StringFieldUpdateOperationsInput | string
    emirateCity?: NullableStringFieldUpdateOperationsInput | string | null
    classLevel?: StringFieldUpdateOperationsInput | string
    curriculum?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    attemptId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpRegistrationUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    schoolName?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: StringFieldUpdateOperationsInput | string
    country?: StringFieldUpdateOperationsInput | string
    emirateCity?: NullableStringFieldUpdateOperationsInput | string | null
    classLevel?: StringFieldUpdateOperationsInput | string
    curriculum?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    attemptId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpRegistrationCreateManyInput = {
    id?: string
    studentName: string
    email?: string | null
    schoolName?: string | null
    phone: string
    country: string
    emirateCity?: string | null
    classLevel: string
    curriculum?: string | null
    status?: string
    attemptId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type LevelUpRegistrationUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    schoolName?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: StringFieldUpdateOperationsInput | string
    country?: StringFieldUpdateOperationsInput | string
    emirateCity?: NullableStringFieldUpdateOperationsInput | string | null
    classLevel?: StringFieldUpdateOperationsInput | string
    curriculum?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    attemptId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpRegistrationUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    schoolName?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: StringFieldUpdateOperationsInput | string
    country?: StringFieldUpdateOperationsInput | string
    emirateCity?: NullableStringFieldUpdateOperationsInput | string | null
    classLevel?: StringFieldUpdateOperationsInput | string
    curriculum?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    attemptId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpAttemptCreateInput = {
    id?: string
    studentName: string
    email?: string | null
    schoolName?: string | null
    studentPhone?: string | null
    country?: string | null
    emirateCity?: string | null
    classLevel: string
    curriculum?: string | null
    status?: string
    startedAt?: Date | string
    submittedAt?: Date | string | null
    scoreObtained?: number
    totalMarks?: number
    percentage?: number
    correctCount?: number
    wrongCount?: number
    unansweredCount?: number
    paperSnapshotJson: JsonNullValueInput | InputJsonValue
    resultSnapshotJson?: NullableJsonNullValueInput | InputJsonValue
    sessionTokenHash: string
    createdAt?: Date | string
    updatedAt?: Date | string
    publishing: LevelUpPublishingCreateNestedOneWithoutAttemptsInput
    answers?: LevelUpAttemptAnswerCreateNestedManyWithoutAttemptInput
  }

  export type LevelUpAttemptUncheckedCreateInput = {
    id?: string
    publishingId: string
    studentName: string
    email?: string | null
    schoolName?: string | null
    studentPhone?: string | null
    country?: string | null
    emirateCity?: string | null
    classLevel: string
    curriculum?: string | null
    status?: string
    startedAt?: Date | string
    submittedAt?: Date | string | null
    scoreObtained?: number
    totalMarks?: number
    percentage?: number
    correctCount?: number
    wrongCount?: number
    unansweredCount?: number
    paperSnapshotJson: JsonNullValueInput | InputJsonValue
    resultSnapshotJson?: NullableJsonNullValueInput | InputJsonValue
    sessionTokenHash: string
    createdAt?: Date | string
    updatedAt?: Date | string
    answers?: LevelUpAttemptAnswerUncheckedCreateNestedManyWithoutAttemptInput
  }

  export type LevelUpAttemptUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    schoolName?: NullableStringFieldUpdateOperationsInput | string | null
    studentPhone?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    emirateCity?: NullableStringFieldUpdateOperationsInput | string | null
    classLevel?: StringFieldUpdateOperationsInput | string
    curriculum?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scoreObtained?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    percentage?: IntFieldUpdateOperationsInput | number
    correctCount?: IntFieldUpdateOperationsInput | number
    wrongCount?: IntFieldUpdateOperationsInput | number
    unansweredCount?: IntFieldUpdateOperationsInput | number
    paperSnapshotJson?: JsonNullValueInput | InputJsonValue
    resultSnapshotJson?: NullableJsonNullValueInput | InputJsonValue
    sessionTokenHash?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishing?: LevelUpPublishingUpdateOneRequiredWithoutAttemptsNestedInput
    answers?: LevelUpAttemptAnswerUpdateManyWithoutAttemptNestedInput
  }

  export type LevelUpAttemptUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    publishingId?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    schoolName?: NullableStringFieldUpdateOperationsInput | string | null
    studentPhone?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    emirateCity?: NullableStringFieldUpdateOperationsInput | string | null
    classLevel?: StringFieldUpdateOperationsInput | string
    curriculum?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scoreObtained?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    percentage?: IntFieldUpdateOperationsInput | number
    correctCount?: IntFieldUpdateOperationsInput | number
    wrongCount?: IntFieldUpdateOperationsInput | number
    unansweredCount?: IntFieldUpdateOperationsInput | number
    paperSnapshotJson?: JsonNullValueInput | InputJsonValue
    resultSnapshotJson?: NullableJsonNullValueInput | InputJsonValue
    sessionTokenHash?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    answers?: LevelUpAttemptAnswerUncheckedUpdateManyWithoutAttemptNestedInput
  }

  export type LevelUpAttemptCreateManyInput = {
    id?: string
    publishingId: string
    studentName: string
    email?: string | null
    schoolName?: string | null
    studentPhone?: string | null
    country?: string | null
    emirateCity?: string | null
    classLevel: string
    curriculum?: string | null
    status?: string
    startedAt?: Date | string
    submittedAt?: Date | string | null
    scoreObtained?: number
    totalMarks?: number
    percentage?: number
    correctCount?: number
    wrongCount?: number
    unansweredCount?: number
    paperSnapshotJson: JsonNullValueInput | InputJsonValue
    resultSnapshotJson?: NullableJsonNullValueInput | InputJsonValue
    sessionTokenHash: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type LevelUpAttemptUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    schoolName?: NullableStringFieldUpdateOperationsInput | string | null
    studentPhone?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    emirateCity?: NullableStringFieldUpdateOperationsInput | string | null
    classLevel?: StringFieldUpdateOperationsInput | string
    curriculum?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scoreObtained?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    percentage?: IntFieldUpdateOperationsInput | number
    correctCount?: IntFieldUpdateOperationsInput | number
    wrongCount?: IntFieldUpdateOperationsInput | number
    unansweredCount?: IntFieldUpdateOperationsInput | number
    paperSnapshotJson?: JsonNullValueInput | InputJsonValue
    resultSnapshotJson?: NullableJsonNullValueInput | InputJsonValue
    sessionTokenHash?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpAttemptUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    publishingId?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    schoolName?: NullableStringFieldUpdateOperationsInput | string | null
    studentPhone?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    emirateCity?: NullableStringFieldUpdateOperationsInput | string | null
    classLevel?: StringFieldUpdateOperationsInput | string
    curriculum?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scoreObtained?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    percentage?: IntFieldUpdateOperationsInput | number
    correctCount?: IntFieldUpdateOperationsInput | number
    wrongCount?: IntFieldUpdateOperationsInput | number
    unansweredCount?: IntFieldUpdateOperationsInput | number
    paperSnapshotJson?: JsonNullValueInput | InputJsonValue
    resultSnapshotJson?: NullableJsonNullValueInput | InputJsonValue
    sessionTokenHash?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpAttemptAnswerCreateInput = {
    id?: string
    questionId: string
    selectedOption: string
    answeredAt?: Date | string
    attempt: LevelUpAttemptCreateNestedOneWithoutAnswersInput
  }

  export type LevelUpAttemptAnswerUncheckedCreateInput = {
    id?: string
    attemptId: string
    questionId: string
    selectedOption: string
    answeredAt?: Date | string
  }

  export type LevelUpAttemptAnswerUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    questionId?: StringFieldUpdateOperationsInput | string
    selectedOption?: StringFieldUpdateOperationsInput | string
    answeredAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attempt?: LevelUpAttemptUpdateOneRequiredWithoutAnswersNestedInput
  }

  export type LevelUpAttemptAnswerUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    attemptId?: StringFieldUpdateOperationsInput | string
    questionId?: StringFieldUpdateOperationsInput | string
    selectedOption?: StringFieldUpdateOperationsInput | string
    answeredAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpAttemptAnswerCreateManyInput = {
    id?: string
    attemptId: string
    questionId: string
    selectedOption: string
    answeredAt?: Date | string
  }

  export type LevelUpAttemptAnswerUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    questionId?: StringFieldUpdateOperationsInput | string
    selectedOption?: StringFieldUpdateOperationsInput | string
    answeredAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpAttemptAnswerUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    attemptId?: StringFieldUpdateOperationsInput | string
    questionId?: StringFieldUpdateOperationsInput | string
    selectedOption?: StringFieldUpdateOperationsInput | string
    answeredAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type LevelUpQuestionListRelationFilter = {
    every?: LevelUpQuestionWhereInput
    some?: LevelUpQuestionWhereInput
    none?: LevelUpQuestionWhereInput
  }

  export type LevelUpPaperListRelationFilter = {
    every?: LevelUpPaperWhereInput
    some?: LevelUpPaperWhereInput
    none?: LevelUpPaperWhereInput
  }

  export type LevelUpPublishingListRelationFilter = {
    every?: LevelUpPublishingWhereInput
    some?: LevelUpPublishingWhereInput
    none?: LevelUpPublishingWhereInput
  }

  export type LevelUpQuestionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type LevelUpPaperOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type LevelUpPublishingOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type LevelUpSubjectCountOrderByAggregateInput = {
    code?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
  }

  export type LevelUpSubjectMaxOrderByAggregateInput = {
    code?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
  }

  export type LevelUpSubjectMinOrderByAggregateInput = {
    code?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type LevelUpSubjectRelationFilter = {
    is?: LevelUpSubjectWhereInput
    isNot?: LevelUpSubjectWhereInput
  }

  export type LevelUpQuestionOptionListRelationFilter = {
    every?: LevelUpQuestionOptionWhereInput
    some?: LevelUpQuestionOptionWhereInput
    none?: LevelUpQuestionOptionWhereInput
  }

  export type LevelUpPaperQuestionListRelationFilter = {
    every?: LevelUpPaperQuestionWhereInput
    some?: LevelUpPaperQuestionWhereInput
    none?: LevelUpPaperQuestionWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type LevelUpQuestionOptionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type LevelUpPaperQuestionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type LevelUpQuestionCountOrderByAggregateInput = {
    id?: SortOrder
    subjectCode?: SortOrder
    classLevel?: SortOrder
    questionText?: SortOrder
    difficulty?: SortOrder
    correctOption?: SortOrder
    explanation?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type LevelUpQuestionMaxOrderByAggregateInput = {
    id?: SortOrder
    subjectCode?: SortOrder
    classLevel?: SortOrder
    questionText?: SortOrder
    difficulty?: SortOrder
    correctOption?: SortOrder
    explanation?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type LevelUpQuestionMinOrderByAggregateInput = {
    id?: SortOrder
    subjectCode?: SortOrder
    classLevel?: SortOrder
    questionText?: SortOrder
    difficulty?: SortOrder
    correctOption?: SortOrder
    explanation?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type LevelUpQuestionRelationFilter = {
    is?: LevelUpQuestionWhereInput
    isNot?: LevelUpQuestionWhereInput
  }

  export type LevelUpQuestionOptionCountOrderByAggregateInput = {
    id?: SortOrder
    questionId?: SortOrder
    optionKey?: SortOrder
    optionText?: SortOrder
    displayOrder?: SortOrder
  }

  export type LevelUpQuestionOptionAvgOrderByAggregateInput = {
    displayOrder?: SortOrder
  }

  export type LevelUpQuestionOptionMaxOrderByAggregateInput = {
    id?: SortOrder
    questionId?: SortOrder
    optionKey?: SortOrder
    optionText?: SortOrder
    displayOrder?: SortOrder
  }

  export type LevelUpQuestionOptionMinOrderByAggregateInput = {
    id?: SortOrder
    questionId?: SortOrder
    optionKey?: SortOrder
    optionText?: SortOrder
    displayOrder?: SortOrder
  }

  export type LevelUpQuestionOptionSumOrderByAggregateInput = {
    displayOrder?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type LevelUpPaperCountOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    subjectCode?: SortOrder
    classLevel?: SortOrder
    durationMinutes?: SortOrder
    totalQuestions?: SortOrder
    totalMarks?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type LevelUpPaperAvgOrderByAggregateInput = {
    durationMinutes?: SortOrder
    totalQuestions?: SortOrder
    totalMarks?: SortOrder
  }

  export type LevelUpPaperMaxOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    subjectCode?: SortOrder
    classLevel?: SortOrder
    durationMinutes?: SortOrder
    totalQuestions?: SortOrder
    totalMarks?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type LevelUpPaperMinOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    subjectCode?: SortOrder
    classLevel?: SortOrder
    durationMinutes?: SortOrder
    totalQuestions?: SortOrder
    totalMarks?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type LevelUpPaperSumOrderByAggregateInput = {
    durationMinutes?: SortOrder
    totalQuestions?: SortOrder
    totalMarks?: SortOrder
  }

  export type LevelUpPaperRelationFilter = {
    is?: LevelUpPaperWhereInput
    isNot?: LevelUpPaperWhereInput
  }

  export type LevelUpPaperQuestionCountOrderByAggregateInput = {
    id?: SortOrder
    paperId?: SortOrder
    questionId?: SortOrder
    displayOrder?: SortOrder
    marks?: SortOrder
  }

  export type LevelUpPaperQuestionAvgOrderByAggregateInput = {
    displayOrder?: SortOrder
    marks?: SortOrder
  }

  export type LevelUpPaperQuestionMaxOrderByAggregateInput = {
    id?: SortOrder
    paperId?: SortOrder
    questionId?: SortOrder
    displayOrder?: SortOrder
    marks?: SortOrder
  }

  export type LevelUpPaperQuestionMinOrderByAggregateInput = {
    id?: SortOrder
    paperId?: SortOrder
    questionId?: SortOrder
    displayOrder?: SortOrder
    marks?: SortOrder
  }

  export type LevelUpPaperQuestionSumOrderByAggregateInput = {
    displayOrder?: SortOrder
    marks?: SortOrder
  }

  export type LevelUpAttemptListRelationFilter = {
    every?: LevelUpAttemptWhereInput
    some?: LevelUpAttemptWhereInput
    none?: LevelUpAttemptWhereInput
  }

  export type LevelUpAttemptOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type LevelUpPublishingCountOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    paperId?: SortOrder
    classLevel?: SortOrder
    subjectCode?: SortOrder
    durationMinutes?: SortOrder
    startAt?: SortOrder
    endAt?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
  }

  export type LevelUpPublishingAvgOrderByAggregateInput = {
    durationMinutes?: SortOrder
  }

  export type LevelUpPublishingMaxOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    paperId?: SortOrder
    classLevel?: SortOrder
    subjectCode?: SortOrder
    durationMinutes?: SortOrder
    startAt?: SortOrder
    endAt?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
  }

  export type LevelUpPublishingMinOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    paperId?: SortOrder
    classLevel?: SortOrder
    subjectCode?: SortOrder
    durationMinutes?: SortOrder
    startAt?: SortOrder
    endAt?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
  }

  export type LevelUpPublishingSumOrderByAggregateInput = {
    durationMinutes?: SortOrder
  }

  export type LevelUpRegistrationCountOrderByAggregateInput = {
    id?: SortOrder
    studentName?: SortOrder
    email?: SortOrder
    schoolName?: SortOrder
    phone?: SortOrder
    country?: SortOrder
    emirateCity?: SortOrder
    classLevel?: SortOrder
    curriculum?: SortOrder
    status?: SortOrder
    attemptId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type LevelUpRegistrationMaxOrderByAggregateInput = {
    id?: SortOrder
    studentName?: SortOrder
    email?: SortOrder
    schoolName?: SortOrder
    phone?: SortOrder
    country?: SortOrder
    emirateCity?: SortOrder
    classLevel?: SortOrder
    curriculum?: SortOrder
    status?: SortOrder
    attemptId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type LevelUpRegistrationMinOrderByAggregateInput = {
    id?: SortOrder
    studentName?: SortOrder
    email?: SortOrder
    schoolName?: SortOrder
    phone?: SortOrder
    country?: SortOrder
    emirateCity?: SortOrder
    classLevel?: SortOrder
    curriculum?: SortOrder
    status?: SortOrder
    attemptId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }
  export type JsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }
  export type JsonNullableFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type LevelUpPublishingRelationFilter = {
    is?: LevelUpPublishingWhereInput
    isNot?: LevelUpPublishingWhereInput
  }

  export type LevelUpAttemptAnswerListRelationFilter = {
    every?: LevelUpAttemptAnswerWhereInput
    some?: LevelUpAttemptAnswerWhereInput
    none?: LevelUpAttemptAnswerWhereInput
  }

  export type LevelUpAttemptAnswerOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type LevelUpAttemptCountOrderByAggregateInput = {
    id?: SortOrder
    publishingId?: SortOrder
    studentName?: SortOrder
    email?: SortOrder
    schoolName?: SortOrder
    studentPhone?: SortOrder
    country?: SortOrder
    emirateCity?: SortOrder
    classLevel?: SortOrder
    curriculum?: SortOrder
    status?: SortOrder
    startedAt?: SortOrder
    submittedAt?: SortOrder
    scoreObtained?: SortOrder
    totalMarks?: SortOrder
    percentage?: SortOrder
    correctCount?: SortOrder
    wrongCount?: SortOrder
    unansweredCount?: SortOrder
    paperSnapshotJson?: SortOrder
    resultSnapshotJson?: SortOrder
    sessionTokenHash?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type LevelUpAttemptAvgOrderByAggregateInput = {
    scoreObtained?: SortOrder
    totalMarks?: SortOrder
    percentage?: SortOrder
    correctCount?: SortOrder
    wrongCount?: SortOrder
    unansweredCount?: SortOrder
  }

  export type LevelUpAttemptMaxOrderByAggregateInput = {
    id?: SortOrder
    publishingId?: SortOrder
    studentName?: SortOrder
    email?: SortOrder
    schoolName?: SortOrder
    studentPhone?: SortOrder
    country?: SortOrder
    emirateCity?: SortOrder
    classLevel?: SortOrder
    curriculum?: SortOrder
    status?: SortOrder
    startedAt?: SortOrder
    submittedAt?: SortOrder
    scoreObtained?: SortOrder
    totalMarks?: SortOrder
    percentage?: SortOrder
    correctCount?: SortOrder
    wrongCount?: SortOrder
    unansweredCount?: SortOrder
    sessionTokenHash?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type LevelUpAttemptMinOrderByAggregateInput = {
    id?: SortOrder
    publishingId?: SortOrder
    studentName?: SortOrder
    email?: SortOrder
    schoolName?: SortOrder
    studentPhone?: SortOrder
    country?: SortOrder
    emirateCity?: SortOrder
    classLevel?: SortOrder
    curriculum?: SortOrder
    status?: SortOrder
    startedAt?: SortOrder
    submittedAt?: SortOrder
    scoreObtained?: SortOrder
    totalMarks?: SortOrder
    percentage?: SortOrder
    correctCount?: SortOrder
    wrongCount?: SortOrder
    unansweredCount?: SortOrder
    sessionTokenHash?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type LevelUpAttemptSumOrderByAggregateInput = {
    scoreObtained?: SortOrder
    totalMarks?: SortOrder
    percentage?: SortOrder
    correctCount?: SortOrder
    wrongCount?: SortOrder
    unansweredCount?: SortOrder
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type LevelUpAttemptRelationFilter = {
    is?: LevelUpAttemptWhereInput
    isNot?: LevelUpAttemptWhereInput
  }

  export type LevelUpAttemptAnswerAttemptIdQuestionIdCompoundUniqueInput = {
    attemptId: string
    questionId: string
  }

  export type LevelUpAttemptAnswerCountOrderByAggregateInput = {
    id?: SortOrder
    attemptId?: SortOrder
    questionId?: SortOrder
    selectedOption?: SortOrder
    answeredAt?: SortOrder
  }

  export type LevelUpAttemptAnswerMaxOrderByAggregateInput = {
    id?: SortOrder
    attemptId?: SortOrder
    questionId?: SortOrder
    selectedOption?: SortOrder
    answeredAt?: SortOrder
  }

  export type LevelUpAttemptAnswerMinOrderByAggregateInput = {
    id?: SortOrder
    attemptId?: SortOrder
    questionId?: SortOrder
    selectedOption?: SortOrder
    answeredAt?: SortOrder
  }

  export type LevelUpQuestionCreateNestedManyWithoutSubjectInput = {
    create?: XOR<LevelUpQuestionCreateWithoutSubjectInput, LevelUpQuestionUncheckedCreateWithoutSubjectInput> | LevelUpQuestionCreateWithoutSubjectInput[] | LevelUpQuestionUncheckedCreateWithoutSubjectInput[]
    connectOrCreate?: LevelUpQuestionCreateOrConnectWithoutSubjectInput | LevelUpQuestionCreateOrConnectWithoutSubjectInput[]
    createMany?: LevelUpQuestionCreateManySubjectInputEnvelope
    connect?: LevelUpQuestionWhereUniqueInput | LevelUpQuestionWhereUniqueInput[]
  }

  export type LevelUpPaperCreateNestedManyWithoutSubjectInput = {
    create?: XOR<LevelUpPaperCreateWithoutSubjectInput, LevelUpPaperUncheckedCreateWithoutSubjectInput> | LevelUpPaperCreateWithoutSubjectInput[] | LevelUpPaperUncheckedCreateWithoutSubjectInput[]
    connectOrCreate?: LevelUpPaperCreateOrConnectWithoutSubjectInput | LevelUpPaperCreateOrConnectWithoutSubjectInput[]
    createMany?: LevelUpPaperCreateManySubjectInputEnvelope
    connect?: LevelUpPaperWhereUniqueInput | LevelUpPaperWhereUniqueInput[]
  }

  export type LevelUpPublishingCreateNestedManyWithoutSubjectInput = {
    create?: XOR<LevelUpPublishingCreateWithoutSubjectInput, LevelUpPublishingUncheckedCreateWithoutSubjectInput> | LevelUpPublishingCreateWithoutSubjectInput[] | LevelUpPublishingUncheckedCreateWithoutSubjectInput[]
    connectOrCreate?: LevelUpPublishingCreateOrConnectWithoutSubjectInput | LevelUpPublishingCreateOrConnectWithoutSubjectInput[]
    createMany?: LevelUpPublishingCreateManySubjectInputEnvelope
    connect?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
  }

  export type LevelUpQuestionUncheckedCreateNestedManyWithoutSubjectInput = {
    create?: XOR<LevelUpQuestionCreateWithoutSubjectInput, LevelUpQuestionUncheckedCreateWithoutSubjectInput> | LevelUpQuestionCreateWithoutSubjectInput[] | LevelUpQuestionUncheckedCreateWithoutSubjectInput[]
    connectOrCreate?: LevelUpQuestionCreateOrConnectWithoutSubjectInput | LevelUpQuestionCreateOrConnectWithoutSubjectInput[]
    createMany?: LevelUpQuestionCreateManySubjectInputEnvelope
    connect?: LevelUpQuestionWhereUniqueInput | LevelUpQuestionWhereUniqueInput[]
  }

  export type LevelUpPaperUncheckedCreateNestedManyWithoutSubjectInput = {
    create?: XOR<LevelUpPaperCreateWithoutSubjectInput, LevelUpPaperUncheckedCreateWithoutSubjectInput> | LevelUpPaperCreateWithoutSubjectInput[] | LevelUpPaperUncheckedCreateWithoutSubjectInput[]
    connectOrCreate?: LevelUpPaperCreateOrConnectWithoutSubjectInput | LevelUpPaperCreateOrConnectWithoutSubjectInput[]
    createMany?: LevelUpPaperCreateManySubjectInputEnvelope
    connect?: LevelUpPaperWhereUniqueInput | LevelUpPaperWhereUniqueInput[]
  }

  export type LevelUpPublishingUncheckedCreateNestedManyWithoutSubjectInput = {
    create?: XOR<LevelUpPublishingCreateWithoutSubjectInput, LevelUpPublishingUncheckedCreateWithoutSubjectInput> | LevelUpPublishingCreateWithoutSubjectInput[] | LevelUpPublishingUncheckedCreateWithoutSubjectInput[]
    connectOrCreate?: LevelUpPublishingCreateOrConnectWithoutSubjectInput | LevelUpPublishingCreateOrConnectWithoutSubjectInput[]
    createMany?: LevelUpPublishingCreateManySubjectInputEnvelope
    connect?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type LevelUpQuestionUpdateManyWithoutSubjectNestedInput = {
    create?: XOR<LevelUpQuestionCreateWithoutSubjectInput, LevelUpQuestionUncheckedCreateWithoutSubjectInput> | LevelUpQuestionCreateWithoutSubjectInput[] | LevelUpQuestionUncheckedCreateWithoutSubjectInput[]
    connectOrCreate?: LevelUpQuestionCreateOrConnectWithoutSubjectInput | LevelUpQuestionCreateOrConnectWithoutSubjectInput[]
    upsert?: LevelUpQuestionUpsertWithWhereUniqueWithoutSubjectInput | LevelUpQuestionUpsertWithWhereUniqueWithoutSubjectInput[]
    createMany?: LevelUpQuestionCreateManySubjectInputEnvelope
    set?: LevelUpQuestionWhereUniqueInput | LevelUpQuestionWhereUniqueInput[]
    disconnect?: LevelUpQuestionWhereUniqueInput | LevelUpQuestionWhereUniqueInput[]
    delete?: LevelUpQuestionWhereUniqueInput | LevelUpQuestionWhereUniqueInput[]
    connect?: LevelUpQuestionWhereUniqueInput | LevelUpQuestionWhereUniqueInput[]
    update?: LevelUpQuestionUpdateWithWhereUniqueWithoutSubjectInput | LevelUpQuestionUpdateWithWhereUniqueWithoutSubjectInput[]
    updateMany?: LevelUpQuestionUpdateManyWithWhereWithoutSubjectInput | LevelUpQuestionUpdateManyWithWhereWithoutSubjectInput[]
    deleteMany?: LevelUpQuestionScalarWhereInput | LevelUpQuestionScalarWhereInput[]
  }

  export type LevelUpPaperUpdateManyWithoutSubjectNestedInput = {
    create?: XOR<LevelUpPaperCreateWithoutSubjectInput, LevelUpPaperUncheckedCreateWithoutSubjectInput> | LevelUpPaperCreateWithoutSubjectInput[] | LevelUpPaperUncheckedCreateWithoutSubjectInput[]
    connectOrCreate?: LevelUpPaperCreateOrConnectWithoutSubjectInput | LevelUpPaperCreateOrConnectWithoutSubjectInput[]
    upsert?: LevelUpPaperUpsertWithWhereUniqueWithoutSubjectInput | LevelUpPaperUpsertWithWhereUniqueWithoutSubjectInput[]
    createMany?: LevelUpPaperCreateManySubjectInputEnvelope
    set?: LevelUpPaperWhereUniqueInput | LevelUpPaperWhereUniqueInput[]
    disconnect?: LevelUpPaperWhereUniqueInput | LevelUpPaperWhereUniqueInput[]
    delete?: LevelUpPaperWhereUniqueInput | LevelUpPaperWhereUniqueInput[]
    connect?: LevelUpPaperWhereUniqueInput | LevelUpPaperWhereUniqueInput[]
    update?: LevelUpPaperUpdateWithWhereUniqueWithoutSubjectInput | LevelUpPaperUpdateWithWhereUniqueWithoutSubjectInput[]
    updateMany?: LevelUpPaperUpdateManyWithWhereWithoutSubjectInput | LevelUpPaperUpdateManyWithWhereWithoutSubjectInput[]
    deleteMany?: LevelUpPaperScalarWhereInput | LevelUpPaperScalarWhereInput[]
  }

  export type LevelUpPublishingUpdateManyWithoutSubjectNestedInput = {
    create?: XOR<LevelUpPublishingCreateWithoutSubjectInput, LevelUpPublishingUncheckedCreateWithoutSubjectInput> | LevelUpPublishingCreateWithoutSubjectInput[] | LevelUpPublishingUncheckedCreateWithoutSubjectInput[]
    connectOrCreate?: LevelUpPublishingCreateOrConnectWithoutSubjectInput | LevelUpPublishingCreateOrConnectWithoutSubjectInput[]
    upsert?: LevelUpPublishingUpsertWithWhereUniqueWithoutSubjectInput | LevelUpPublishingUpsertWithWhereUniqueWithoutSubjectInput[]
    createMany?: LevelUpPublishingCreateManySubjectInputEnvelope
    set?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
    disconnect?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
    delete?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
    connect?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
    update?: LevelUpPublishingUpdateWithWhereUniqueWithoutSubjectInput | LevelUpPublishingUpdateWithWhereUniqueWithoutSubjectInput[]
    updateMany?: LevelUpPublishingUpdateManyWithWhereWithoutSubjectInput | LevelUpPublishingUpdateManyWithWhereWithoutSubjectInput[]
    deleteMany?: LevelUpPublishingScalarWhereInput | LevelUpPublishingScalarWhereInput[]
  }

  export type LevelUpQuestionUncheckedUpdateManyWithoutSubjectNestedInput = {
    create?: XOR<LevelUpQuestionCreateWithoutSubjectInput, LevelUpQuestionUncheckedCreateWithoutSubjectInput> | LevelUpQuestionCreateWithoutSubjectInput[] | LevelUpQuestionUncheckedCreateWithoutSubjectInput[]
    connectOrCreate?: LevelUpQuestionCreateOrConnectWithoutSubjectInput | LevelUpQuestionCreateOrConnectWithoutSubjectInput[]
    upsert?: LevelUpQuestionUpsertWithWhereUniqueWithoutSubjectInput | LevelUpQuestionUpsertWithWhereUniqueWithoutSubjectInput[]
    createMany?: LevelUpQuestionCreateManySubjectInputEnvelope
    set?: LevelUpQuestionWhereUniqueInput | LevelUpQuestionWhereUniqueInput[]
    disconnect?: LevelUpQuestionWhereUniqueInput | LevelUpQuestionWhereUniqueInput[]
    delete?: LevelUpQuestionWhereUniqueInput | LevelUpQuestionWhereUniqueInput[]
    connect?: LevelUpQuestionWhereUniqueInput | LevelUpQuestionWhereUniqueInput[]
    update?: LevelUpQuestionUpdateWithWhereUniqueWithoutSubjectInput | LevelUpQuestionUpdateWithWhereUniqueWithoutSubjectInput[]
    updateMany?: LevelUpQuestionUpdateManyWithWhereWithoutSubjectInput | LevelUpQuestionUpdateManyWithWhereWithoutSubjectInput[]
    deleteMany?: LevelUpQuestionScalarWhereInput | LevelUpQuestionScalarWhereInput[]
  }

  export type LevelUpPaperUncheckedUpdateManyWithoutSubjectNestedInput = {
    create?: XOR<LevelUpPaperCreateWithoutSubjectInput, LevelUpPaperUncheckedCreateWithoutSubjectInput> | LevelUpPaperCreateWithoutSubjectInput[] | LevelUpPaperUncheckedCreateWithoutSubjectInput[]
    connectOrCreate?: LevelUpPaperCreateOrConnectWithoutSubjectInput | LevelUpPaperCreateOrConnectWithoutSubjectInput[]
    upsert?: LevelUpPaperUpsertWithWhereUniqueWithoutSubjectInput | LevelUpPaperUpsertWithWhereUniqueWithoutSubjectInput[]
    createMany?: LevelUpPaperCreateManySubjectInputEnvelope
    set?: LevelUpPaperWhereUniqueInput | LevelUpPaperWhereUniqueInput[]
    disconnect?: LevelUpPaperWhereUniqueInput | LevelUpPaperWhereUniqueInput[]
    delete?: LevelUpPaperWhereUniqueInput | LevelUpPaperWhereUniqueInput[]
    connect?: LevelUpPaperWhereUniqueInput | LevelUpPaperWhereUniqueInput[]
    update?: LevelUpPaperUpdateWithWhereUniqueWithoutSubjectInput | LevelUpPaperUpdateWithWhereUniqueWithoutSubjectInput[]
    updateMany?: LevelUpPaperUpdateManyWithWhereWithoutSubjectInput | LevelUpPaperUpdateManyWithWhereWithoutSubjectInput[]
    deleteMany?: LevelUpPaperScalarWhereInput | LevelUpPaperScalarWhereInput[]
  }

  export type LevelUpPublishingUncheckedUpdateManyWithoutSubjectNestedInput = {
    create?: XOR<LevelUpPublishingCreateWithoutSubjectInput, LevelUpPublishingUncheckedCreateWithoutSubjectInput> | LevelUpPublishingCreateWithoutSubjectInput[] | LevelUpPublishingUncheckedCreateWithoutSubjectInput[]
    connectOrCreate?: LevelUpPublishingCreateOrConnectWithoutSubjectInput | LevelUpPublishingCreateOrConnectWithoutSubjectInput[]
    upsert?: LevelUpPublishingUpsertWithWhereUniqueWithoutSubjectInput | LevelUpPublishingUpsertWithWhereUniqueWithoutSubjectInput[]
    createMany?: LevelUpPublishingCreateManySubjectInputEnvelope
    set?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
    disconnect?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
    delete?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
    connect?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
    update?: LevelUpPublishingUpdateWithWhereUniqueWithoutSubjectInput | LevelUpPublishingUpdateWithWhereUniqueWithoutSubjectInput[]
    updateMany?: LevelUpPublishingUpdateManyWithWhereWithoutSubjectInput | LevelUpPublishingUpdateManyWithWhereWithoutSubjectInput[]
    deleteMany?: LevelUpPublishingScalarWhereInput | LevelUpPublishingScalarWhereInput[]
  }

  export type LevelUpSubjectCreateNestedOneWithoutQuestionsInput = {
    create?: XOR<LevelUpSubjectCreateWithoutQuestionsInput, LevelUpSubjectUncheckedCreateWithoutQuestionsInput>
    connectOrCreate?: LevelUpSubjectCreateOrConnectWithoutQuestionsInput
    connect?: LevelUpSubjectWhereUniqueInput
  }

  export type LevelUpQuestionOptionCreateNestedManyWithoutQuestionInput = {
    create?: XOR<LevelUpQuestionOptionCreateWithoutQuestionInput, LevelUpQuestionOptionUncheckedCreateWithoutQuestionInput> | LevelUpQuestionOptionCreateWithoutQuestionInput[] | LevelUpQuestionOptionUncheckedCreateWithoutQuestionInput[]
    connectOrCreate?: LevelUpQuestionOptionCreateOrConnectWithoutQuestionInput | LevelUpQuestionOptionCreateOrConnectWithoutQuestionInput[]
    createMany?: LevelUpQuestionOptionCreateManyQuestionInputEnvelope
    connect?: LevelUpQuestionOptionWhereUniqueInput | LevelUpQuestionOptionWhereUniqueInput[]
  }

  export type LevelUpPaperQuestionCreateNestedManyWithoutQuestionInput = {
    create?: XOR<LevelUpPaperQuestionCreateWithoutQuestionInput, LevelUpPaperQuestionUncheckedCreateWithoutQuestionInput> | LevelUpPaperQuestionCreateWithoutQuestionInput[] | LevelUpPaperQuestionUncheckedCreateWithoutQuestionInput[]
    connectOrCreate?: LevelUpPaperQuestionCreateOrConnectWithoutQuestionInput | LevelUpPaperQuestionCreateOrConnectWithoutQuestionInput[]
    createMany?: LevelUpPaperQuestionCreateManyQuestionInputEnvelope
    connect?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
  }

  export type LevelUpQuestionOptionUncheckedCreateNestedManyWithoutQuestionInput = {
    create?: XOR<LevelUpQuestionOptionCreateWithoutQuestionInput, LevelUpQuestionOptionUncheckedCreateWithoutQuestionInput> | LevelUpQuestionOptionCreateWithoutQuestionInput[] | LevelUpQuestionOptionUncheckedCreateWithoutQuestionInput[]
    connectOrCreate?: LevelUpQuestionOptionCreateOrConnectWithoutQuestionInput | LevelUpQuestionOptionCreateOrConnectWithoutQuestionInput[]
    createMany?: LevelUpQuestionOptionCreateManyQuestionInputEnvelope
    connect?: LevelUpQuestionOptionWhereUniqueInput | LevelUpQuestionOptionWhereUniqueInput[]
  }

  export type LevelUpPaperQuestionUncheckedCreateNestedManyWithoutQuestionInput = {
    create?: XOR<LevelUpPaperQuestionCreateWithoutQuestionInput, LevelUpPaperQuestionUncheckedCreateWithoutQuestionInput> | LevelUpPaperQuestionCreateWithoutQuestionInput[] | LevelUpPaperQuestionUncheckedCreateWithoutQuestionInput[]
    connectOrCreate?: LevelUpPaperQuestionCreateOrConnectWithoutQuestionInput | LevelUpPaperQuestionCreateOrConnectWithoutQuestionInput[]
    createMany?: LevelUpPaperQuestionCreateManyQuestionInputEnvelope
    connect?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type LevelUpSubjectUpdateOneRequiredWithoutQuestionsNestedInput = {
    create?: XOR<LevelUpSubjectCreateWithoutQuestionsInput, LevelUpSubjectUncheckedCreateWithoutQuestionsInput>
    connectOrCreate?: LevelUpSubjectCreateOrConnectWithoutQuestionsInput
    upsert?: LevelUpSubjectUpsertWithoutQuestionsInput
    connect?: LevelUpSubjectWhereUniqueInput
    update?: XOR<XOR<LevelUpSubjectUpdateToOneWithWhereWithoutQuestionsInput, LevelUpSubjectUpdateWithoutQuestionsInput>, LevelUpSubjectUncheckedUpdateWithoutQuestionsInput>
  }

  export type LevelUpQuestionOptionUpdateManyWithoutQuestionNestedInput = {
    create?: XOR<LevelUpQuestionOptionCreateWithoutQuestionInput, LevelUpQuestionOptionUncheckedCreateWithoutQuestionInput> | LevelUpQuestionOptionCreateWithoutQuestionInput[] | LevelUpQuestionOptionUncheckedCreateWithoutQuestionInput[]
    connectOrCreate?: LevelUpQuestionOptionCreateOrConnectWithoutQuestionInput | LevelUpQuestionOptionCreateOrConnectWithoutQuestionInput[]
    upsert?: LevelUpQuestionOptionUpsertWithWhereUniqueWithoutQuestionInput | LevelUpQuestionOptionUpsertWithWhereUniqueWithoutQuestionInput[]
    createMany?: LevelUpQuestionOptionCreateManyQuestionInputEnvelope
    set?: LevelUpQuestionOptionWhereUniqueInput | LevelUpQuestionOptionWhereUniqueInput[]
    disconnect?: LevelUpQuestionOptionWhereUniqueInput | LevelUpQuestionOptionWhereUniqueInput[]
    delete?: LevelUpQuestionOptionWhereUniqueInput | LevelUpQuestionOptionWhereUniqueInput[]
    connect?: LevelUpQuestionOptionWhereUniqueInput | LevelUpQuestionOptionWhereUniqueInput[]
    update?: LevelUpQuestionOptionUpdateWithWhereUniqueWithoutQuestionInput | LevelUpQuestionOptionUpdateWithWhereUniqueWithoutQuestionInput[]
    updateMany?: LevelUpQuestionOptionUpdateManyWithWhereWithoutQuestionInput | LevelUpQuestionOptionUpdateManyWithWhereWithoutQuestionInput[]
    deleteMany?: LevelUpQuestionOptionScalarWhereInput | LevelUpQuestionOptionScalarWhereInput[]
  }

  export type LevelUpPaperQuestionUpdateManyWithoutQuestionNestedInput = {
    create?: XOR<LevelUpPaperQuestionCreateWithoutQuestionInput, LevelUpPaperQuestionUncheckedCreateWithoutQuestionInput> | LevelUpPaperQuestionCreateWithoutQuestionInput[] | LevelUpPaperQuestionUncheckedCreateWithoutQuestionInput[]
    connectOrCreate?: LevelUpPaperQuestionCreateOrConnectWithoutQuestionInput | LevelUpPaperQuestionCreateOrConnectWithoutQuestionInput[]
    upsert?: LevelUpPaperQuestionUpsertWithWhereUniqueWithoutQuestionInput | LevelUpPaperQuestionUpsertWithWhereUniqueWithoutQuestionInput[]
    createMany?: LevelUpPaperQuestionCreateManyQuestionInputEnvelope
    set?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
    disconnect?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
    delete?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
    connect?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
    update?: LevelUpPaperQuestionUpdateWithWhereUniqueWithoutQuestionInput | LevelUpPaperQuestionUpdateWithWhereUniqueWithoutQuestionInput[]
    updateMany?: LevelUpPaperQuestionUpdateManyWithWhereWithoutQuestionInput | LevelUpPaperQuestionUpdateManyWithWhereWithoutQuestionInput[]
    deleteMany?: LevelUpPaperQuestionScalarWhereInput | LevelUpPaperQuestionScalarWhereInput[]
  }

  export type LevelUpQuestionOptionUncheckedUpdateManyWithoutQuestionNestedInput = {
    create?: XOR<LevelUpQuestionOptionCreateWithoutQuestionInput, LevelUpQuestionOptionUncheckedCreateWithoutQuestionInput> | LevelUpQuestionOptionCreateWithoutQuestionInput[] | LevelUpQuestionOptionUncheckedCreateWithoutQuestionInput[]
    connectOrCreate?: LevelUpQuestionOptionCreateOrConnectWithoutQuestionInput | LevelUpQuestionOptionCreateOrConnectWithoutQuestionInput[]
    upsert?: LevelUpQuestionOptionUpsertWithWhereUniqueWithoutQuestionInput | LevelUpQuestionOptionUpsertWithWhereUniqueWithoutQuestionInput[]
    createMany?: LevelUpQuestionOptionCreateManyQuestionInputEnvelope
    set?: LevelUpQuestionOptionWhereUniqueInput | LevelUpQuestionOptionWhereUniqueInput[]
    disconnect?: LevelUpQuestionOptionWhereUniqueInput | LevelUpQuestionOptionWhereUniqueInput[]
    delete?: LevelUpQuestionOptionWhereUniqueInput | LevelUpQuestionOptionWhereUniqueInput[]
    connect?: LevelUpQuestionOptionWhereUniqueInput | LevelUpQuestionOptionWhereUniqueInput[]
    update?: LevelUpQuestionOptionUpdateWithWhereUniqueWithoutQuestionInput | LevelUpQuestionOptionUpdateWithWhereUniqueWithoutQuestionInput[]
    updateMany?: LevelUpQuestionOptionUpdateManyWithWhereWithoutQuestionInput | LevelUpQuestionOptionUpdateManyWithWhereWithoutQuestionInput[]
    deleteMany?: LevelUpQuestionOptionScalarWhereInput | LevelUpQuestionOptionScalarWhereInput[]
  }

  export type LevelUpPaperQuestionUncheckedUpdateManyWithoutQuestionNestedInput = {
    create?: XOR<LevelUpPaperQuestionCreateWithoutQuestionInput, LevelUpPaperQuestionUncheckedCreateWithoutQuestionInput> | LevelUpPaperQuestionCreateWithoutQuestionInput[] | LevelUpPaperQuestionUncheckedCreateWithoutQuestionInput[]
    connectOrCreate?: LevelUpPaperQuestionCreateOrConnectWithoutQuestionInput | LevelUpPaperQuestionCreateOrConnectWithoutQuestionInput[]
    upsert?: LevelUpPaperQuestionUpsertWithWhereUniqueWithoutQuestionInput | LevelUpPaperQuestionUpsertWithWhereUniqueWithoutQuestionInput[]
    createMany?: LevelUpPaperQuestionCreateManyQuestionInputEnvelope
    set?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
    disconnect?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
    delete?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
    connect?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
    update?: LevelUpPaperQuestionUpdateWithWhereUniqueWithoutQuestionInput | LevelUpPaperQuestionUpdateWithWhereUniqueWithoutQuestionInput[]
    updateMany?: LevelUpPaperQuestionUpdateManyWithWhereWithoutQuestionInput | LevelUpPaperQuestionUpdateManyWithWhereWithoutQuestionInput[]
    deleteMany?: LevelUpPaperQuestionScalarWhereInput | LevelUpPaperQuestionScalarWhereInput[]
  }

  export type LevelUpQuestionCreateNestedOneWithoutOptionsInput = {
    create?: XOR<LevelUpQuestionCreateWithoutOptionsInput, LevelUpQuestionUncheckedCreateWithoutOptionsInput>
    connectOrCreate?: LevelUpQuestionCreateOrConnectWithoutOptionsInput
    connect?: LevelUpQuestionWhereUniqueInput
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type LevelUpQuestionUpdateOneRequiredWithoutOptionsNestedInput = {
    create?: XOR<LevelUpQuestionCreateWithoutOptionsInput, LevelUpQuestionUncheckedCreateWithoutOptionsInput>
    connectOrCreate?: LevelUpQuestionCreateOrConnectWithoutOptionsInput
    upsert?: LevelUpQuestionUpsertWithoutOptionsInput
    connect?: LevelUpQuestionWhereUniqueInput
    update?: XOR<XOR<LevelUpQuestionUpdateToOneWithWhereWithoutOptionsInput, LevelUpQuestionUpdateWithoutOptionsInput>, LevelUpQuestionUncheckedUpdateWithoutOptionsInput>
  }

  export type LevelUpSubjectCreateNestedOneWithoutPapersInput = {
    create?: XOR<LevelUpSubjectCreateWithoutPapersInput, LevelUpSubjectUncheckedCreateWithoutPapersInput>
    connectOrCreate?: LevelUpSubjectCreateOrConnectWithoutPapersInput
    connect?: LevelUpSubjectWhereUniqueInput
  }

  export type LevelUpPaperQuestionCreateNestedManyWithoutPaperInput = {
    create?: XOR<LevelUpPaperQuestionCreateWithoutPaperInput, LevelUpPaperQuestionUncheckedCreateWithoutPaperInput> | LevelUpPaperQuestionCreateWithoutPaperInput[] | LevelUpPaperQuestionUncheckedCreateWithoutPaperInput[]
    connectOrCreate?: LevelUpPaperQuestionCreateOrConnectWithoutPaperInput | LevelUpPaperQuestionCreateOrConnectWithoutPaperInput[]
    createMany?: LevelUpPaperQuestionCreateManyPaperInputEnvelope
    connect?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
  }

  export type LevelUpPublishingCreateNestedManyWithoutPaperInput = {
    create?: XOR<LevelUpPublishingCreateWithoutPaperInput, LevelUpPublishingUncheckedCreateWithoutPaperInput> | LevelUpPublishingCreateWithoutPaperInput[] | LevelUpPublishingUncheckedCreateWithoutPaperInput[]
    connectOrCreate?: LevelUpPublishingCreateOrConnectWithoutPaperInput | LevelUpPublishingCreateOrConnectWithoutPaperInput[]
    createMany?: LevelUpPublishingCreateManyPaperInputEnvelope
    connect?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
  }

  export type LevelUpPaperQuestionUncheckedCreateNestedManyWithoutPaperInput = {
    create?: XOR<LevelUpPaperQuestionCreateWithoutPaperInput, LevelUpPaperQuestionUncheckedCreateWithoutPaperInput> | LevelUpPaperQuestionCreateWithoutPaperInput[] | LevelUpPaperQuestionUncheckedCreateWithoutPaperInput[]
    connectOrCreate?: LevelUpPaperQuestionCreateOrConnectWithoutPaperInput | LevelUpPaperQuestionCreateOrConnectWithoutPaperInput[]
    createMany?: LevelUpPaperQuestionCreateManyPaperInputEnvelope
    connect?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
  }

  export type LevelUpPublishingUncheckedCreateNestedManyWithoutPaperInput = {
    create?: XOR<LevelUpPublishingCreateWithoutPaperInput, LevelUpPublishingUncheckedCreateWithoutPaperInput> | LevelUpPublishingCreateWithoutPaperInput[] | LevelUpPublishingUncheckedCreateWithoutPaperInput[]
    connectOrCreate?: LevelUpPublishingCreateOrConnectWithoutPaperInput | LevelUpPublishingCreateOrConnectWithoutPaperInput[]
    createMany?: LevelUpPublishingCreateManyPaperInputEnvelope
    connect?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
  }

  export type LevelUpSubjectUpdateOneRequiredWithoutPapersNestedInput = {
    create?: XOR<LevelUpSubjectCreateWithoutPapersInput, LevelUpSubjectUncheckedCreateWithoutPapersInput>
    connectOrCreate?: LevelUpSubjectCreateOrConnectWithoutPapersInput
    upsert?: LevelUpSubjectUpsertWithoutPapersInput
    connect?: LevelUpSubjectWhereUniqueInput
    update?: XOR<XOR<LevelUpSubjectUpdateToOneWithWhereWithoutPapersInput, LevelUpSubjectUpdateWithoutPapersInput>, LevelUpSubjectUncheckedUpdateWithoutPapersInput>
  }

  export type LevelUpPaperQuestionUpdateManyWithoutPaperNestedInput = {
    create?: XOR<LevelUpPaperQuestionCreateWithoutPaperInput, LevelUpPaperQuestionUncheckedCreateWithoutPaperInput> | LevelUpPaperQuestionCreateWithoutPaperInput[] | LevelUpPaperQuestionUncheckedCreateWithoutPaperInput[]
    connectOrCreate?: LevelUpPaperQuestionCreateOrConnectWithoutPaperInput | LevelUpPaperQuestionCreateOrConnectWithoutPaperInput[]
    upsert?: LevelUpPaperQuestionUpsertWithWhereUniqueWithoutPaperInput | LevelUpPaperQuestionUpsertWithWhereUniqueWithoutPaperInput[]
    createMany?: LevelUpPaperQuestionCreateManyPaperInputEnvelope
    set?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
    disconnect?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
    delete?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
    connect?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
    update?: LevelUpPaperQuestionUpdateWithWhereUniqueWithoutPaperInput | LevelUpPaperQuestionUpdateWithWhereUniqueWithoutPaperInput[]
    updateMany?: LevelUpPaperQuestionUpdateManyWithWhereWithoutPaperInput | LevelUpPaperQuestionUpdateManyWithWhereWithoutPaperInput[]
    deleteMany?: LevelUpPaperQuestionScalarWhereInput | LevelUpPaperQuestionScalarWhereInput[]
  }

  export type LevelUpPublishingUpdateManyWithoutPaperNestedInput = {
    create?: XOR<LevelUpPublishingCreateWithoutPaperInput, LevelUpPublishingUncheckedCreateWithoutPaperInput> | LevelUpPublishingCreateWithoutPaperInput[] | LevelUpPublishingUncheckedCreateWithoutPaperInput[]
    connectOrCreate?: LevelUpPublishingCreateOrConnectWithoutPaperInput | LevelUpPublishingCreateOrConnectWithoutPaperInput[]
    upsert?: LevelUpPublishingUpsertWithWhereUniqueWithoutPaperInput | LevelUpPublishingUpsertWithWhereUniqueWithoutPaperInput[]
    createMany?: LevelUpPublishingCreateManyPaperInputEnvelope
    set?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
    disconnect?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
    delete?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
    connect?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
    update?: LevelUpPublishingUpdateWithWhereUniqueWithoutPaperInput | LevelUpPublishingUpdateWithWhereUniqueWithoutPaperInput[]
    updateMany?: LevelUpPublishingUpdateManyWithWhereWithoutPaperInput | LevelUpPublishingUpdateManyWithWhereWithoutPaperInput[]
    deleteMany?: LevelUpPublishingScalarWhereInput | LevelUpPublishingScalarWhereInput[]
  }

  export type LevelUpPaperQuestionUncheckedUpdateManyWithoutPaperNestedInput = {
    create?: XOR<LevelUpPaperQuestionCreateWithoutPaperInput, LevelUpPaperQuestionUncheckedCreateWithoutPaperInput> | LevelUpPaperQuestionCreateWithoutPaperInput[] | LevelUpPaperQuestionUncheckedCreateWithoutPaperInput[]
    connectOrCreate?: LevelUpPaperQuestionCreateOrConnectWithoutPaperInput | LevelUpPaperQuestionCreateOrConnectWithoutPaperInput[]
    upsert?: LevelUpPaperQuestionUpsertWithWhereUniqueWithoutPaperInput | LevelUpPaperQuestionUpsertWithWhereUniqueWithoutPaperInput[]
    createMany?: LevelUpPaperQuestionCreateManyPaperInputEnvelope
    set?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
    disconnect?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
    delete?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
    connect?: LevelUpPaperQuestionWhereUniqueInput | LevelUpPaperQuestionWhereUniqueInput[]
    update?: LevelUpPaperQuestionUpdateWithWhereUniqueWithoutPaperInput | LevelUpPaperQuestionUpdateWithWhereUniqueWithoutPaperInput[]
    updateMany?: LevelUpPaperQuestionUpdateManyWithWhereWithoutPaperInput | LevelUpPaperQuestionUpdateManyWithWhereWithoutPaperInput[]
    deleteMany?: LevelUpPaperQuestionScalarWhereInput | LevelUpPaperQuestionScalarWhereInput[]
  }

  export type LevelUpPublishingUncheckedUpdateManyWithoutPaperNestedInput = {
    create?: XOR<LevelUpPublishingCreateWithoutPaperInput, LevelUpPublishingUncheckedCreateWithoutPaperInput> | LevelUpPublishingCreateWithoutPaperInput[] | LevelUpPublishingUncheckedCreateWithoutPaperInput[]
    connectOrCreate?: LevelUpPublishingCreateOrConnectWithoutPaperInput | LevelUpPublishingCreateOrConnectWithoutPaperInput[]
    upsert?: LevelUpPublishingUpsertWithWhereUniqueWithoutPaperInput | LevelUpPublishingUpsertWithWhereUniqueWithoutPaperInput[]
    createMany?: LevelUpPublishingCreateManyPaperInputEnvelope
    set?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
    disconnect?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
    delete?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
    connect?: LevelUpPublishingWhereUniqueInput | LevelUpPublishingWhereUniqueInput[]
    update?: LevelUpPublishingUpdateWithWhereUniqueWithoutPaperInput | LevelUpPublishingUpdateWithWhereUniqueWithoutPaperInput[]
    updateMany?: LevelUpPublishingUpdateManyWithWhereWithoutPaperInput | LevelUpPublishingUpdateManyWithWhereWithoutPaperInput[]
    deleteMany?: LevelUpPublishingScalarWhereInput | LevelUpPublishingScalarWhereInput[]
  }

  export type LevelUpPaperCreateNestedOneWithoutQuestionsInput = {
    create?: XOR<LevelUpPaperCreateWithoutQuestionsInput, LevelUpPaperUncheckedCreateWithoutQuestionsInput>
    connectOrCreate?: LevelUpPaperCreateOrConnectWithoutQuestionsInput
    connect?: LevelUpPaperWhereUniqueInput
  }

  export type LevelUpQuestionCreateNestedOneWithoutPaperLinksInput = {
    create?: XOR<LevelUpQuestionCreateWithoutPaperLinksInput, LevelUpQuestionUncheckedCreateWithoutPaperLinksInput>
    connectOrCreate?: LevelUpQuestionCreateOrConnectWithoutPaperLinksInput
    connect?: LevelUpQuestionWhereUniqueInput
  }

  export type LevelUpPaperUpdateOneRequiredWithoutQuestionsNestedInput = {
    create?: XOR<LevelUpPaperCreateWithoutQuestionsInput, LevelUpPaperUncheckedCreateWithoutQuestionsInput>
    connectOrCreate?: LevelUpPaperCreateOrConnectWithoutQuestionsInput
    upsert?: LevelUpPaperUpsertWithoutQuestionsInput
    connect?: LevelUpPaperWhereUniqueInput
    update?: XOR<XOR<LevelUpPaperUpdateToOneWithWhereWithoutQuestionsInput, LevelUpPaperUpdateWithoutQuestionsInput>, LevelUpPaperUncheckedUpdateWithoutQuestionsInput>
  }

  export type LevelUpQuestionUpdateOneRequiredWithoutPaperLinksNestedInput = {
    create?: XOR<LevelUpQuestionCreateWithoutPaperLinksInput, LevelUpQuestionUncheckedCreateWithoutPaperLinksInput>
    connectOrCreate?: LevelUpQuestionCreateOrConnectWithoutPaperLinksInput
    upsert?: LevelUpQuestionUpsertWithoutPaperLinksInput
    connect?: LevelUpQuestionWhereUniqueInput
    update?: XOR<XOR<LevelUpQuestionUpdateToOneWithWhereWithoutPaperLinksInput, LevelUpQuestionUpdateWithoutPaperLinksInput>, LevelUpQuestionUncheckedUpdateWithoutPaperLinksInput>
  }

  export type LevelUpPaperCreateNestedOneWithoutPublishingsInput = {
    create?: XOR<LevelUpPaperCreateWithoutPublishingsInput, LevelUpPaperUncheckedCreateWithoutPublishingsInput>
    connectOrCreate?: LevelUpPaperCreateOrConnectWithoutPublishingsInput
    connect?: LevelUpPaperWhereUniqueInput
  }

  export type LevelUpSubjectCreateNestedOneWithoutPublishingsInput = {
    create?: XOR<LevelUpSubjectCreateWithoutPublishingsInput, LevelUpSubjectUncheckedCreateWithoutPublishingsInput>
    connectOrCreate?: LevelUpSubjectCreateOrConnectWithoutPublishingsInput
    connect?: LevelUpSubjectWhereUniqueInput
  }

  export type LevelUpAttemptCreateNestedManyWithoutPublishingInput = {
    create?: XOR<LevelUpAttemptCreateWithoutPublishingInput, LevelUpAttemptUncheckedCreateWithoutPublishingInput> | LevelUpAttemptCreateWithoutPublishingInput[] | LevelUpAttemptUncheckedCreateWithoutPublishingInput[]
    connectOrCreate?: LevelUpAttemptCreateOrConnectWithoutPublishingInput | LevelUpAttemptCreateOrConnectWithoutPublishingInput[]
    createMany?: LevelUpAttemptCreateManyPublishingInputEnvelope
    connect?: LevelUpAttemptWhereUniqueInput | LevelUpAttemptWhereUniqueInput[]
  }

  export type LevelUpAttemptUncheckedCreateNestedManyWithoutPublishingInput = {
    create?: XOR<LevelUpAttemptCreateWithoutPublishingInput, LevelUpAttemptUncheckedCreateWithoutPublishingInput> | LevelUpAttemptCreateWithoutPublishingInput[] | LevelUpAttemptUncheckedCreateWithoutPublishingInput[]
    connectOrCreate?: LevelUpAttemptCreateOrConnectWithoutPublishingInput | LevelUpAttemptCreateOrConnectWithoutPublishingInput[]
    createMany?: LevelUpAttemptCreateManyPublishingInputEnvelope
    connect?: LevelUpAttemptWhereUniqueInput | LevelUpAttemptWhereUniqueInput[]
  }

  export type LevelUpPaperUpdateOneRequiredWithoutPublishingsNestedInput = {
    create?: XOR<LevelUpPaperCreateWithoutPublishingsInput, LevelUpPaperUncheckedCreateWithoutPublishingsInput>
    connectOrCreate?: LevelUpPaperCreateOrConnectWithoutPublishingsInput
    upsert?: LevelUpPaperUpsertWithoutPublishingsInput
    connect?: LevelUpPaperWhereUniqueInput
    update?: XOR<XOR<LevelUpPaperUpdateToOneWithWhereWithoutPublishingsInput, LevelUpPaperUpdateWithoutPublishingsInput>, LevelUpPaperUncheckedUpdateWithoutPublishingsInput>
  }

  export type LevelUpSubjectUpdateOneRequiredWithoutPublishingsNestedInput = {
    create?: XOR<LevelUpSubjectCreateWithoutPublishingsInput, LevelUpSubjectUncheckedCreateWithoutPublishingsInput>
    connectOrCreate?: LevelUpSubjectCreateOrConnectWithoutPublishingsInput
    upsert?: LevelUpSubjectUpsertWithoutPublishingsInput
    connect?: LevelUpSubjectWhereUniqueInput
    update?: XOR<XOR<LevelUpSubjectUpdateToOneWithWhereWithoutPublishingsInput, LevelUpSubjectUpdateWithoutPublishingsInput>, LevelUpSubjectUncheckedUpdateWithoutPublishingsInput>
  }

  export type LevelUpAttemptUpdateManyWithoutPublishingNestedInput = {
    create?: XOR<LevelUpAttemptCreateWithoutPublishingInput, LevelUpAttemptUncheckedCreateWithoutPublishingInput> | LevelUpAttemptCreateWithoutPublishingInput[] | LevelUpAttemptUncheckedCreateWithoutPublishingInput[]
    connectOrCreate?: LevelUpAttemptCreateOrConnectWithoutPublishingInput | LevelUpAttemptCreateOrConnectWithoutPublishingInput[]
    upsert?: LevelUpAttemptUpsertWithWhereUniqueWithoutPublishingInput | LevelUpAttemptUpsertWithWhereUniqueWithoutPublishingInput[]
    createMany?: LevelUpAttemptCreateManyPublishingInputEnvelope
    set?: LevelUpAttemptWhereUniqueInput | LevelUpAttemptWhereUniqueInput[]
    disconnect?: LevelUpAttemptWhereUniqueInput | LevelUpAttemptWhereUniqueInput[]
    delete?: LevelUpAttemptWhereUniqueInput | LevelUpAttemptWhereUniqueInput[]
    connect?: LevelUpAttemptWhereUniqueInput | LevelUpAttemptWhereUniqueInput[]
    update?: LevelUpAttemptUpdateWithWhereUniqueWithoutPublishingInput | LevelUpAttemptUpdateWithWhereUniqueWithoutPublishingInput[]
    updateMany?: LevelUpAttemptUpdateManyWithWhereWithoutPublishingInput | LevelUpAttemptUpdateManyWithWhereWithoutPublishingInput[]
    deleteMany?: LevelUpAttemptScalarWhereInput | LevelUpAttemptScalarWhereInput[]
  }

  export type LevelUpAttemptUncheckedUpdateManyWithoutPublishingNestedInput = {
    create?: XOR<LevelUpAttemptCreateWithoutPublishingInput, LevelUpAttemptUncheckedCreateWithoutPublishingInput> | LevelUpAttemptCreateWithoutPublishingInput[] | LevelUpAttemptUncheckedCreateWithoutPublishingInput[]
    connectOrCreate?: LevelUpAttemptCreateOrConnectWithoutPublishingInput | LevelUpAttemptCreateOrConnectWithoutPublishingInput[]
    upsert?: LevelUpAttemptUpsertWithWhereUniqueWithoutPublishingInput | LevelUpAttemptUpsertWithWhereUniqueWithoutPublishingInput[]
    createMany?: LevelUpAttemptCreateManyPublishingInputEnvelope
    set?: LevelUpAttemptWhereUniqueInput | LevelUpAttemptWhereUniqueInput[]
    disconnect?: LevelUpAttemptWhereUniqueInput | LevelUpAttemptWhereUniqueInput[]
    delete?: LevelUpAttemptWhereUniqueInput | LevelUpAttemptWhereUniqueInput[]
    connect?: LevelUpAttemptWhereUniqueInput | LevelUpAttemptWhereUniqueInput[]
    update?: LevelUpAttemptUpdateWithWhereUniqueWithoutPublishingInput | LevelUpAttemptUpdateWithWhereUniqueWithoutPublishingInput[]
    updateMany?: LevelUpAttemptUpdateManyWithWhereWithoutPublishingInput | LevelUpAttemptUpdateManyWithWhereWithoutPublishingInput[]
    deleteMany?: LevelUpAttemptScalarWhereInput | LevelUpAttemptScalarWhereInput[]
  }

  export type LevelUpPublishingCreateNestedOneWithoutAttemptsInput = {
    create?: XOR<LevelUpPublishingCreateWithoutAttemptsInput, LevelUpPublishingUncheckedCreateWithoutAttemptsInput>
    connectOrCreate?: LevelUpPublishingCreateOrConnectWithoutAttemptsInput
    connect?: LevelUpPublishingWhereUniqueInput
  }

  export type LevelUpAttemptAnswerCreateNestedManyWithoutAttemptInput = {
    create?: XOR<LevelUpAttemptAnswerCreateWithoutAttemptInput, LevelUpAttemptAnswerUncheckedCreateWithoutAttemptInput> | LevelUpAttemptAnswerCreateWithoutAttemptInput[] | LevelUpAttemptAnswerUncheckedCreateWithoutAttemptInput[]
    connectOrCreate?: LevelUpAttemptAnswerCreateOrConnectWithoutAttemptInput | LevelUpAttemptAnswerCreateOrConnectWithoutAttemptInput[]
    createMany?: LevelUpAttemptAnswerCreateManyAttemptInputEnvelope
    connect?: LevelUpAttemptAnswerWhereUniqueInput | LevelUpAttemptAnswerWhereUniqueInput[]
  }

  export type LevelUpAttemptAnswerUncheckedCreateNestedManyWithoutAttemptInput = {
    create?: XOR<LevelUpAttemptAnswerCreateWithoutAttemptInput, LevelUpAttemptAnswerUncheckedCreateWithoutAttemptInput> | LevelUpAttemptAnswerCreateWithoutAttemptInput[] | LevelUpAttemptAnswerUncheckedCreateWithoutAttemptInput[]
    connectOrCreate?: LevelUpAttemptAnswerCreateOrConnectWithoutAttemptInput | LevelUpAttemptAnswerCreateOrConnectWithoutAttemptInput[]
    createMany?: LevelUpAttemptAnswerCreateManyAttemptInputEnvelope
    connect?: LevelUpAttemptAnswerWhereUniqueInput | LevelUpAttemptAnswerWhereUniqueInput[]
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type LevelUpPublishingUpdateOneRequiredWithoutAttemptsNestedInput = {
    create?: XOR<LevelUpPublishingCreateWithoutAttemptsInput, LevelUpPublishingUncheckedCreateWithoutAttemptsInput>
    connectOrCreate?: LevelUpPublishingCreateOrConnectWithoutAttemptsInput
    upsert?: LevelUpPublishingUpsertWithoutAttemptsInput
    connect?: LevelUpPublishingWhereUniqueInput
    update?: XOR<XOR<LevelUpPublishingUpdateToOneWithWhereWithoutAttemptsInput, LevelUpPublishingUpdateWithoutAttemptsInput>, LevelUpPublishingUncheckedUpdateWithoutAttemptsInput>
  }

  export type LevelUpAttemptAnswerUpdateManyWithoutAttemptNestedInput = {
    create?: XOR<LevelUpAttemptAnswerCreateWithoutAttemptInput, LevelUpAttemptAnswerUncheckedCreateWithoutAttemptInput> | LevelUpAttemptAnswerCreateWithoutAttemptInput[] | LevelUpAttemptAnswerUncheckedCreateWithoutAttemptInput[]
    connectOrCreate?: LevelUpAttemptAnswerCreateOrConnectWithoutAttemptInput | LevelUpAttemptAnswerCreateOrConnectWithoutAttemptInput[]
    upsert?: LevelUpAttemptAnswerUpsertWithWhereUniqueWithoutAttemptInput | LevelUpAttemptAnswerUpsertWithWhereUniqueWithoutAttemptInput[]
    createMany?: LevelUpAttemptAnswerCreateManyAttemptInputEnvelope
    set?: LevelUpAttemptAnswerWhereUniqueInput | LevelUpAttemptAnswerWhereUniqueInput[]
    disconnect?: LevelUpAttemptAnswerWhereUniqueInput | LevelUpAttemptAnswerWhereUniqueInput[]
    delete?: LevelUpAttemptAnswerWhereUniqueInput | LevelUpAttemptAnswerWhereUniqueInput[]
    connect?: LevelUpAttemptAnswerWhereUniqueInput | LevelUpAttemptAnswerWhereUniqueInput[]
    update?: LevelUpAttemptAnswerUpdateWithWhereUniqueWithoutAttemptInput | LevelUpAttemptAnswerUpdateWithWhereUniqueWithoutAttemptInput[]
    updateMany?: LevelUpAttemptAnswerUpdateManyWithWhereWithoutAttemptInput | LevelUpAttemptAnswerUpdateManyWithWhereWithoutAttemptInput[]
    deleteMany?: LevelUpAttemptAnswerScalarWhereInput | LevelUpAttemptAnswerScalarWhereInput[]
  }

  export type LevelUpAttemptAnswerUncheckedUpdateManyWithoutAttemptNestedInput = {
    create?: XOR<LevelUpAttemptAnswerCreateWithoutAttemptInput, LevelUpAttemptAnswerUncheckedCreateWithoutAttemptInput> | LevelUpAttemptAnswerCreateWithoutAttemptInput[] | LevelUpAttemptAnswerUncheckedCreateWithoutAttemptInput[]
    connectOrCreate?: LevelUpAttemptAnswerCreateOrConnectWithoutAttemptInput | LevelUpAttemptAnswerCreateOrConnectWithoutAttemptInput[]
    upsert?: LevelUpAttemptAnswerUpsertWithWhereUniqueWithoutAttemptInput | LevelUpAttemptAnswerUpsertWithWhereUniqueWithoutAttemptInput[]
    createMany?: LevelUpAttemptAnswerCreateManyAttemptInputEnvelope
    set?: LevelUpAttemptAnswerWhereUniqueInput | LevelUpAttemptAnswerWhereUniqueInput[]
    disconnect?: LevelUpAttemptAnswerWhereUniqueInput | LevelUpAttemptAnswerWhereUniqueInput[]
    delete?: LevelUpAttemptAnswerWhereUniqueInput | LevelUpAttemptAnswerWhereUniqueInput[]
    connect?: LevelUpAttemptAnswerWhereUniqueInput | LevelUpAttemptAnswerWhereUniqueInput[]
    update?: LevelUpAttemptAnswerUpdateWithWhereUniqueWithoutAttemptInput | LevelUpAttemptAnswerUpdateWithWhereUniqueWithoutAttemptInput[]
    updateMany?: LevelUpAttemptAnswerUpdateManyWithWhereWithoutAttemptInput | LevelUpAttemptAnswerUpdateManyWithWhereWithoutAttemptInput[]
    deleteMany?: LevelUpAttemptAnswerScalarWhereInput | LevelUpAttemptAnswerScalarWhereInput[]
  }

  export type LevelUpAttemptCreateNestedOneWithoutAnswersInput = {
    create?: XOR<LevelUpAttemptCreateWithoutAnswersInput, LevelUpAttemptUncheckedCreateWithoutAnswersInput>
    connectOrCreate?: LevelUpAttemptCreateOrConnectWithoutAnswersInput
    connect?: LevelUpAttemptWhereUniqueInput
  }

  export type LevelUpAttemptUpdateOneRequiredWithoutAnswersNestedInput = {
    create?: XOR<LevelUpAttemptCreateWithoutAnswersInput, LevelUpAttemptUncheckedCreateWithoutAnswersInput>
    connectOrCreate?: LevelUpAttemptCreateOrConnectWithoutAnswersInput
    upsert?: LevelUpAttemptUpsertWithoutAnswersInput
    connect?: LevelUpAttemptWhereUniqueInput
    update?: XOR<XOR<LevelUpAttemptUpdateToOneWithWhereWithoutAnswersInput, LevelUpAttemptUpdateWithoutAnswersInput>, LevelUpAttemptUncheckedUpdateWithoutAnswersInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type LevelUpQuestionCreateWithoutSubjectInput = {
    id?: string
    classLevel: string
    questionText: string
    difficulty?: string
    correctOption: string
    explanation?: string | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    options?: LevelUpQuestionOptionCreateNestedManyWithoutQuestionInput
    paperLinks?: LevelUpPaperQuestionCreateNestedManyWithoutQuestionInput
  }

  export type LevelUpQuestionUncheckedCreateWithoutSubjectInput = {
    id?: string
    classLevel: string
    questionText: string
    difficulty?: string
    correctOption: string
    explanation?: string | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    options?: LevelUpQuestionOptionUncheckedCreateNestedManyWithoutQuestionInput
    paperLinks?: LevelUpPaperQuestionUncheckedCreateNestedManyWithoutQuestionInput
  }

  export type LevelUpQuestionCreateOrConnectWithoutSubjectInput = {
    where: LevelUpQuestionWhereUniqueInput
    create: XOR<LevelUpQuestionCreateWithoutSubjectInput, LevelUpQuestionUncheckedCreateWithoutSubjectInput>
  }

  export type LevelUpQuestionCreateManySubjectInputEnvelope = {
    data: LevelUpQuestionCreateManySubjectInput | LevelUpQuestionCreateManySubjectInput[]
    skipDuplicates?: boolean
  }

  export type LevelUpPaperCreateWithoutSubjectInput = {
    id?: string
    title: string
    classLevel: string
    durationMinutes?: number
    totalQuestions?: number
    totalMarks?: number
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    questions?: LevelUpPaperQuestionCreateNestedManyWithoutPaperInput
    publishings?: LevelUpPublishingCreateNestedManyWithoutPaperInput
  }

  export type LevelUpPaperUncheckedCreateWithoutSubjectInput = {
    id?: string
    title: string
    classLevel: string
    durationMinutes?: number
    totalQuestions?: number
    totalMarks?: number
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    questions?: LevelUpPaperQuestionUncheckedCreateNestedManyWithoutPaperInput
    publishings?: LevelUpPublishingUncheckedCreateNestedManyWithoutPaperInput
  }

  export type LevelUpPaperCreateOrConnectWithoutSubjectInput = {
    where: LevelUpPaperWhereUniqueInput
    create: XOR<LevelUpPaperCreateWithoutSubjectInput, LevelUpPaperUncheckedCreateWithoutSubjectInput>
  }

  export type LevelUpPaperCreateManySubjectInputEnvelope = {
    data: LevelUpPaperCreateManySubjectInput | LevelUpPaperCreateManySubjectInput[]
    skipDuplicates?: boolean
  }

  export type LevelUpPublishingCreateWithoutSubjectInput = {
    id?: string
    slug: string
    title: string
    classLevel: string
    durationMinutes: number
    startAt: Date | string
    endAt: Date | string
    isActive?: boolean
    createdAt?: Date | string
    paper: LevelUpPaperCreateNestedOneWithoutPublishingsInput
    attempts?: LevelUpAttemptCreateNestedManyWithoutPublishingInput
  }

  export type LevelUpPublishingUncheckedCreateWithoutSubjectInput = {
    id?: string
    slug: string
    title: string
    paperId: string
    classLevel: string
    durationMinutes: number
    startAt: Date | string
    endAt: Date | string
    isActive?: boolean
    createdAt?: Date | string
    attempts?: LevelUpAttemptUncheckedCreateNestedManyWithoutPublishingInput
  }

  export type LevelUpPublishingCreateOrConnectWithoutSubjectInput = {
    where: LevelUpPublishingWhereUniqueInput
    create: XOR<LevelUpPublishingCreateWithoutSubjectInput, LevelUpPublishingUncheckedCreateWithoutSubjectInput>
  }

  export type LevelUpPublishingCreateManySubjectInputEnvelope = {
    data: LevelUpPublishingCreateManySubjectInput | LevelUpPublishingCreateManySubjectInput[]
    skipDuplicates?: boolean
  }

  export type LevelUpQuestionUpsertWithWhereUniqueWithoutSubjectInput = {
    where: LevelUpQuestionWhereUniqueInput
    update: XOR<LevelUpQuestionUpdateWithoutSubjectInput, LevelUpQuestionUncheckedUpdateWithoutSubjectInput>
    create: XOR<LevelUpQuestionCreateWithoutSubjectInput, LevelUpQuestionUncheckedCreateWithoutSubjectInput>
  }

  export type LevelUpQuestionUpdateWithWhereUniqueWithoutSubjectInput = {
    where: LevelUpQuestionWhereUniqueInput
    data: XOR<LevelUpQuestionUpdateWithoutSubjectInput, LevelUpQuestionUncheckedUpdateWithoutSubjectInput>
  }

  export type LevelUpQuestionUpdateManyWithWhereWithoutSubjectInput = {
    where: LevelUpQuestionScalarWhereInput
    data: XOR<LevelUpQuestionUpdateManyMutationInput, LevelUpQuestionUncheckedUpdateManyWithoutSubjectInput>
  }

  export type LevelUpQuestionScalarWhereInput = {
    AND?: LevelUpQuestionScalarWhereInput | LevelUpQuestionScalarWhereInput[]
    OR?: LevelUpQuestionScalarWhereInput[]
    NOT?: LevelUpQuestionScalarWhereInput | LevelUpQuestionScalarWhereInput[]
    id?: StringFilter<"LevelUpQuestion"> | string
    subjectCode?: StringFilter<"LevelUpQuestion"> | string
    classLevel?: StringFilter<"LevelUpQuestion"> | string
    questionText?: StringFilter<"LevelUpQuestion"> | string
    difficulty?: StringFilter<"LevelUpQuestion"> | string
    correctOption?: StringFilter<"LevelUpQuestion"> | string
    explanation?: StringNullableFilter<"LevelUpQuestion"> | string | null
    isActive?: BoolFilter<"LevelUpQuestion"> | boolean
    createdAt?: DateTimeFilter<"LevelUpQuestion"> | Date | string
    updatedAt?: DateTimeFilter<"LevelUpQuestion"> | Date | string
  }

  export type LevelUpPaperUpsertWithWhereUniqueWithoutSubjectInput = {
    where: LevelUpPaperWhereUniqueInput
    update: XOR<LevelUpPaperUpdateWithoutSubjectInput, LevelUpPaperUncheckedUpdateWithoutSubjectInput>
    create: XOR<LevelUpPaperCreateWithoutSubjectInput, LevelUpPaperUncheckedCreateWithoutSubjectInput>
  }

  export type LevelUpPaperUpdateWithWhereUniqueWithoutSubjectInput = {
    where: LevelUpPaperWhereUniqueInput
    data: XOR<LevelUpPaperUpdateWithoutSubjectInput, LevelUpPaperUncheckedUpdateWithoutSubjectInput>
  }

  export type LevelUpPaperUpdateManyWithWhereWithoutSubjectInput = {
    where: LevelUpPaperScalarWhereInput
    data: XOR<LevelUpPaperUpdateManyMutationInput, LevelUpPaperUncheckedUpdateManyWithoutSubjectInput>
  }

  export type LevelUpPaperScalarWhereInput = {
    AND?: LevelUpPaperScalarWhereInput | LevelUpPaperScalarWhereInput[]
    OR?: LevelUpPaperScalarWhereInput[]
    NOT?: LevelUpPaperScalarWhereInput | LevelUpPaperScalarWhereInput[]
    id?: StringFilter<"LevelUpPaper"> | string
    title?: StringFilter<"LevelUpPaper"> | string
    subjectCode?: StringFilter<"LevelUpPaper"> | string
    classLevel?: StringFilter<"LevelUpPaper"> | string
    durationMinutes?: IntFilter<"LevelUpPaper"> | number
    totalQuestions?: IntFilter<"LevelUpPaper"> | number
    totalMarks?: IntFilter<"LevelUpPaper"> | number
    status?: StringFilter<"LevelUpPaper"> | string
    createdAt?: DateTimeFilter<"LevelUpPaper"> | Date | string
    updatedAt?: DateTimeFilter<"LevelUpPaper"> | Date | string
  }

  export type LevelUpPublishingUpsertWithWhereUniqueWithoutSubjectInput = {
    where: LevelUpPublishingWhereUniqueInput
    update: XOR<LevelUpPublishingUpdateWithoutSubjectInput, LevelUpPublishingUncheckedUpdateWithoutSubjectInput>
    create: XOR<LevelUpPublishingCreateWithoutSubjectInput, LevelUpPublishingUncheckedCreateWithoutSubjectInput>
  }

  export type LevelUpPublishingUpdateWithWhereUniqueWithoutSubjectInput = {
    where: LevelUpPublishingWhereUniqueInput
    data: XOR<LevelUpPublishingUpdateWithoutSubjectInput, LevelUpPublishingUncheckedUpdateWithoutSubjectInput>
  }

  export type LevelUpPublishingUpdateManyWithWhereWithoutSubjectInput = {
    where: LevelUpPublishingScalarWhereInput
    data: XOR<LevelUpPublishingUpdateManyMutationInput, LevelUpPublishingUncheckedUpdateManyWithoutSubjectInput>
  }

  export type LevelUpPublishingScalarWhereInput = {
    AND?: LevelUpPublishingScalarWhereInput | LevelUpPublishingScalarWhereInput[]
    OR?: LevelUpPublishingScalarWhereInput[]
    NOT?: LevelUpPublishingScalarWhereInput | LevelUpPublishingScalarWhereInput[]
    id?: StringFilter<"LevelUpPublishing"> | string
    slug?: StringFilter<"LevelUpPublishing"> | string
    title?: StringFilter<"LevelUpPublishing"> | string
    paperId?: StringFilter<"LevelUpPublishing"> | string
    classLevel?: StringFilter<"LevelUpPublishing"> | string
    subjectCode?: StringFilter<"LevelUpPublishing"> | string
    durationMinutes?: IntFilter<"LevelUpPublishing"> | number
    startAt?: DateTimeFilter<"LevelUpPublishing"> | Date | string
    endAt?: DateTimeFilter<"LevelUpPublishing"> | Date | string
    isActive?: BoolFilter<"LevelUpPublishing"> | boolean
    createdAt?: DateTimeFilter<"LevelUpPublishing"> | Date | string
  }

  export type LevelUpSubjectCreateWithoutQuestionsInput = {
    code: string
    name: string
    createdAt?: Date | string
    papers?: LevelUpPaperCreateNestedManyWithoutSubjectInput
    publishings?: LevelUpPublishingCreateNestedManyWithoutSubjectInput
  }

  export type LevelUpSubjectUncheckedCreateWithoutQuestionsInput = {
    code: string
    name: string
    createdAt?: Date | string
    papers?: LevelUpPaperUncheckedCreateNestedManyWithoutSubjectInput
    publishings?: LevelUpPublishingUncheckedCreateNestedManyWithoutSubjectInput
  }

  export type LevelUpSubjectCreateOrConnectWithoutQuestionsInput = {
    where: LevelUpSubjectWhereUniqueInput
    create: XOR<LevelUpSubjectCreateWithoutQuestionsInput, LevelUpSubjectUncheckedCreateWithoutQuestionsInput>
  }

  export type LevelUpQuestionOptionCreateWithoutQuestionInput = {
    id?: string
    optionKey: string
    optionText: string
    displayOrder: number
  }

  export type LevelUpQuestionOptionUncheckedCreateWithoutQuestionInput = {
    id?: string
    optionKey: string
    optionText: string
    displayOrder: number
  }

  export type LevelUpQuestionOptionCreateOrConnectWithoutQuestionInput = {
    where: LevelUpQuestionOptionWhereUniqueInput
    create: XOR<LevelUpQuestionOptionCreateWithoutQuestionInput, LevelUpQuestionOptionUncheckedCreateWithoutQuestionInput>
  }

  export type LevelUpQuestionOptionCreateManyQuestionInputEnvelope = {
    data: LevelUpQuestionOptionCreateManyQuestionInput | LevelUpQuestionOptionCreateManyQuestionInput[]
    skipDuplicates?: boolean
  }

  export type LevelUpPaperQuestionCreateWithoutQuestionInput = {
    id?: string
    displayOrder: number
    marks?: number
    paper: LevelUpPaperCreateNestedOneWithoutQuestionsInput
  }

  export type LevelUpPaperQuestionUncheckedCreateWithoutQuestionInput = {
    id?: string
    paperId: string
    displayOrder: number
    marks?: number
  }

  export type LevelUpPaperQuestionCreateOrConnectWithoutQuestionInput = {
    where: LevelUpPaperQuestionWhereUniqueInput
    create: XOR<LevelUpPaperQuestionCreateWithoutQuestionInput, LevelUpPaperQuestionUncheckedCreateWithoutQuestionInput>
  }

  export type LevelUpPaperQuestionCreateManyQuestionInputEnvelope = {
    data: LevelUpPaperQuestionCreateManyQuestionInput | LevelUpPaperQuestionCreateManyQuestionInput[]
    skipDuplicates?: boolean
  }

  export type LevelUpSubjectUpsertWithoutQuestionsInput = {
    update: XOR<LevelUpSubjectUpdateWithoutQuestionsInput, LevelUpSubjectUncheckedUpdateWithoutQuestionsInput>
    create: XOR<LevelUpSubjectCreateWithoutQuestionsInput, LevelUpSubjectUncheckedCreateWithoutQuestionsInput>
    where?: LevelUpSubjectWhereInput
  }

  export type LevelUpSubjectUpdateToOneWithWhereWithoutQuestionsInput = {
    where?: LevelUpSubjectWhereInput
    data: XOR<LevelUpSubjectUpdateWithoutQuestionsInput, LevelUpSubjectUncheckedUpdateWithoutQuestionsInput>
  }

  export type LevelUpSubjectUpdateWithoutQuestionsInput = {
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    papers?: LevelUpPaperUpdateManyWithoutSubjectNestedInput
    publishings?: LevelUpPublishingUpdateManyWithoutSubjectNestedInput
  }

  export type LevelUpSubjectUncheckedUpdateWithoutQuestionsInput = {
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    papers?: LevelUpPaperUncheckedUpdateManyWithoutSubjectNestedInput
    publishings?: LevelUpPublishingUncheckedUpdateManyWithoutSubjectNestedInput
  }

  export type LevelUpQuestionOptionUpsertWithWhereUniqueWithoutQuestionInput = {
    where: LevelUpQuestionOptionWhereUniqueInput
    update: XOR<LevelUpQuestionOptionUpdateWithoutQuestionInput, LevelUpQuestionOptionUncheckedUpdateWithoutQuestionInput>
    create: XOR<LevelUpQuestionOptionCreateWithoutQuestionInput, LevelUpQuestionOptionUncheckedCreateWithoutQuestionInput>
  }

  export type LevelUpQuestionOptionUpdateWithWhereUniqueWithoutQuestionInput = {
    where: LevelUpQuestionOptionWhereUniqueInput
    data: XOR<LevelUpQuestionOptionUpdateWithoutQuestionInput, LevelUpQuestionOptionUncheckedUpdateWithoutQuestionInput>
  }

  export type LevelUpQuestionOptionUpdateManyWithWhereWithoutQuestionInput = {
    where: LevelUpQuestionOptionScalarWhereInput
    data: XOR<LevelUpQuestionOptionUpdateManyMutationInput, LevelUpQuestionOptionUncheckedUpdateManyWithoutQuestionInput>
  }

  export type LevelUpQuestionOptionScalarWhereInput = {
    AND?: LevelUpQuestionOptionScalarWhereInput | LevelUpQuestionOptionScalarWhereInput[]
    OR?: LevelUpQuestionOptionScalarWhereInput[]
    NOT?: LevelUpQuestionOptionScalarWhereInput | LevelUpQuestionOptionScalarWhereInput[]
    id?: StringFilter<"LevelUpQuestionOption"> | string
    questionId?: StringFilter<"LevelUpQuestionOption"> | string
    optionKey?: StringFilter<"LevelUpQuestionOption"> | string
    optionText?: StringFilter<"LevelUpQuestionOption"> | string
    displayOrder?: IntFilter<"LevelUpQuestionOption"> | number
  }

  export type LevelUpPaperQuestionUpsertWithWhereUniqueWithoutQuestionInput = {
    where: LevelUpPaperQuestionWhereUniqueInput
    update: XOR<LevelUpPaperQuestionUpdateWithoutQuestionInput, LevelUpPaperQuestionUncheckedUpdateWithoutQuestionInput>
    create: XOR<LevelUpPaperQuestionCreateWithoutQuestionInput, LevelUpPaperQuestionUncheckedCreateWithoutQuestionInput>
  }

  export type LevelUpPaperQuestionUpdateWithWhereUniqueWithoutQuestionInput = {
    where: LevelUpPaperQuestionWhereUniqueInput
    data: XOR<LevelUpPaperQuestionUpdateWithoutQuestionInput, LevelUpPaperQuestionUncheckedUpdateWithoutQuestionInput>
  }

  export type LevelUpPaperQuestionUpdateManyWithWhereWithoutQuestionInput = {
    where: LevelUpPaperQuestionScalarWhereInput
    data: XOR<LevelUpPaperQuestionUpdateManyMutationInput, LevelUpPaperQuestionUncheckedUpdateManyWithoutQuestionInput>
  }

  export type LevelUpPaperQuestionScalarWhereInput = {
    AND?: LevelUpPaperQuestionScalarWhereInput | LevelUpPaperQuestionScalarWhereInput[]
    OR?: LevelUpPaperQuestionScalarWhereInput[]
    NOT?: LevelUpPaperQuestionScalarWhereInput | LevelUpPaperQuestionScalarWhereInput[]
    id?: StringFilter<"LevelUpPaperQuestion"> | string
    paperId?: StringFilter<"LevelUpPaperQuestion"> | string
    questionId?: StringFilter<"LevelUpPaperQuestion"> | string
    displayOrder?: IntFilter<"LevelUpPaperQuestion"> | number
    marks?: IntFilter<"LevelUpPaperQuestion"> | number
  }

  export type LevelUpQuestionCreateWithoutOptionsInput = {
    id?: string
    classLevel: string
    questionText: string
    difficulty?: string
    correctOption: string
    explanation?: string | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    subject: LevelUpSubjectCreateNestedOneWithoutQuestionsInput
    paperLinks?: LevelUpPaperQuestionCreateNestedManyWithoutQuestionInput
  }

  export type LevelUpQuestionUncheckedCreateWithoutOptionsInput = {
    id?: string
    subjectCode: string
    classLevel: string
    questionText: string
    difficulty?: string
    correctOption: string
    explanation?: string | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    paperLinks?: LevelUpPaperQuestionUncheckedCreateNestedManyWithoutQuestionInput
  }

  export type LevelUpQuestionCreateOrConnectWithoutOptionsInput = {
    where: LevelUpQuestionWhereUniqueInput
    create: XOR<LevelUpQuestionCreateWithoutOptionsInput, LevelUpQuestionUncheckedCreateWithoutOptionsInput>
  }

  export type LevelUpQuestionUpsertWithoutOptionsInput = {
    update: XOR<LevelUpQuestionUpdateWithoutOptionsInput, LevelUpQuestionUncheckedUpdateWithoutOptionsInput>
    create: XOR<LevelUpQuestionCreateWithoutOptionsInput, LevelUpQuestionUncheckedCreateWithoutOptionsInput>
    where?: LevelUpQuestionWhereInput
  }

  export type LevelUpQuestionUpdateToOneWithWhereWithoutOptionsInput = {
    where?: LevelUpQuestionWhereInput
    data: XOR<LevelUpQuestionUpdateWithoutOptionsInput, LevelUpQuestionUncheckedUpdateWithoutOptionsInput>
  }

  export type LevelUpQuestionUpdateWithoutOptionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    questionText?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    correctOption?: StringFieldUpdateOperationsInput | string
    explanation?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subject?: LevelUpSubjectUpdateOneRequiredWithoutQuestionsNestedInput
    paperLinks?: LevelUpPaperQuestionUpdateManyWithoutQuestionNestedInput
  }

  export type LevelUpQuestionUncheckedUpdateWithoutOptionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    subjectCode?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    questionText?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    correctOption?: StringFieldUpdateOperationsInput | string
    explanation?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    paperLinks?: LevelUpPaperQuestionUncheckedUpdateManyWithoutQuestionNestedInput
  }

  export type LevelUpSubjectCreateWithoutPapersInput = {
    code: string
    name: string
    createdAt?: Date | string
    questions?: LevelUpQuestionCreateNestedManyWithoutSubjectInput
    publishings?: LevelUpPublishingCreateNestedManyWithoutSubjectInput
  }

  export type LevelUpSubjectUncheckedCreateWithoutPapersInput = {
    code: string
    name: string
    createdAt?: Date | string
    questions?: LevelUpQuestionUncheckedCreateNestedManyWithoutSubjectInput
    publishings?: LevelUpPublishingUncheckedCreateNestedManyWithoutSubjectInput
  }

  export type LevelUpSubjectCreateOrConnectWithoutPapersInput = {
    where: LevelUpSubjectWhereUniqueInput
    create: XOR<LevelUpSubjectCreateWithoutPapersInput, LevelUpSubjectUncheckedCreateWithoutPapersInput>
  }

  export type LevelUpPaperQuestionCreateWithoutPaperInput = {
    id?: string
    displayOrder: number
    marks?: number
    question: LevelUpQuestionCreateNestedOneWithoutPaperLinksInput
  }

  export type LevelUpPaperQuestionUncheckedCreateWithoutPaperInput = {
    id?: string
    questionId: string
    displayOrder: number
    marks?: number
  }

  export type LevelUpPaperQuestionCreateOrConnectWithoutPaperInput = {
    where: LevelUpPaperQuestionWhereUniqueInput
    create: XOR<LevelUpPaperQuestionCreateWithoutPaperInput, LevelUpPaperQuestionUncheckedCreateWithoutPaperInput>
  }

  export type LevelUpPaperQuestionCreateManyPaperInputEnvelope = {
    data: LevelUpPaperQuestionCreateManyPaperInput | LevelUpPaperQuestionCreateManyPaperInput[]
    skipDuplicates?: boolean
  }

  export type LevelUpPublishingCreateWithoutPaperInput = {
    id?: string
    slug: string
    title: string
    classLevel: string
    durationMinutes: number
    startAt: Date | string
    endAt: Date | string
    isActive?: boolean
    createdAt?: Date | string
    subject: LevelUpSubjectCreateNestedOneWithoutPublishingsInput
    attempts?: LevelUpAttemptCreateNestedManyWithoutPublishingInput
  }

  export type LevelUpPublishingUncheckedCreateWithoutPaperInput = {
    id?: string
    slug: string
    title: string
    classLevel: string
    subjectCode: string
    durationMinutes: number
    startAt: Date | string
    endAt: Date | string
    isActive?: boolean
    createdAt?: Date | string
    attempts?: LevelUpAttemptUncheckedCreateNestedManyWithoutPublishingInput
  }

  export type LevelUpPublishingCreateOrConnectWithoutPaperInput = {
    where: LevelUpPublishingWhereUniqueInput
    create: XOR<LevelUpPublishingCreateWithoutPaperInput, LevelUpPublishingUncheckedCreateWithoutPaperInput>
  }

  export type LevelUpPublishingCreateManyPaperInputEnvelope = {
    data: LevelUpPublishingCreateManyPaperInput | LevelUpPublishingCreateManyPaperInput[]
    skipDuplicates?: boolean
  }

  export type LevelUpSubjectUpsertWithoutPapersInput = {
    update: XOR<LevelUpSubjectUpdateWithoutPapersInput, LevelUpSubjectUncheckedUpdateWithoutPapersInput>
    create: XOR<LevelUpSubjectCreateWithoutPapersInput, LevelUpSubjectUncheckedCreateWithoutPapersInput>
    where?: LevelUpSubjectWhereInput
  }

  export type LevelUpSubjectUpdateToOneWithWhereWithoutPapersInput = {
    where?: LevelUpSubjectWhereInput
    data: XOR<LevelUpSubjectUpdateWithoutPapersInput, LevelUpSubjectUncheckedUpdateWithoutPapersInput>
  }

  export type LevelUpSubjectUpdateWithoutPapersInput = {
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    questions?: LevelUpQuestionUpdateManyWithoutSubjectNestedInput
    publishings?: LevelUpPublishingUpdateManyWithoutSubjectNestedInput
  }

  export type LevelUpSubjectUncheckedUpdateWithoutPapersInput = {
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    questions?: LevelUpQuestionUncheckedUpdateManyWithoutSubjectNestedInput
    publishings?: LevelUpPublishingUncheckedUpdateManyWithoutSubjectNestedInput
  }

  export type LevelUpPaperQuestionUpsertWithWhereUniqueWithoutPaperInput = {
    where: LevelUpPaperQuestionWhereUniqueInput
    update: XOR<LevelUpPaperQuestionUpdateWithoutPaperInput, LevelUpPaperQuestionUncheckedUpdateWithoutPaperInput>
    create: XOR<LevelUpPaperQuestionCreateWithoutPaperInput, LevelUpPaperQuestionUncheckedCreateWithoutPaperInput>
  }

  export type LevelUpPaperQuestionUpdateWithWhereUniqueWithoutPaperInput = {
    where: LevelUpPaperQuestionWhereUniqueInput
    data: XOR<LevelUpPaperQuestionUpdateWithoutPaperInput, LevelUpPaperQuestionUncheckedUpdateWithoutPaperInput>
  }

  export type LevelUpPaperQuestionUpdateManyWithWhereWithoutPaperInput = {
    where: LevelUpPaperQuestionScalarWhereInput
    data: XOR<LevelUpPaperQuestionUpdateManyMutationInput, LevelUpPaperQuestionUncheckedUpdateManyWithoutPaperInput>
  }

  export type LevelUpPublishingUpsertWithWhereUniqueWithoutPaperInput = {
    where: LevelUpPublishingWhereUniqueInput
    update: XOR<LevelUpPublishingUpdateWithoutPaperInput, LevelUpPublishingUncheckedUpdateWithoutPaperInput>
    create: XOR<LevelUpPublishingCreateWithoutPaperInput, LevelUpPublishingUncheckedCreateWithoutPaperInput>
  }

  export type LevelUpPublishingUpdateWithWhereUniqueWithoutPaperInput = {
    where: LevelUpPublishingWhereUniqueInput
    data: XOR<LevelUpPublishingUpdateWithoutPaperInput, LevelUpPublishingUncheckedUpdateWithoutPaperInput>
  }

  export type LevelUpPublishingUpdateManyWithWhereWithoutPaperInput = {
    where: LevelUpPublishingScalarWhereInput
    data: XOR<LevelUpPublishingUpdateManyMutationInput, LevelUpPublishingUncheckedUpdateManyWithoutPaperInput>
  }

  export type LevelUpPaperCreateWithoutQuestionsInput = {
    id?: string
    title: string
    classLevel: string
    durationMinutes?: number
    totalQuestions?: number
    totalMarks?: number
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    subject: LevelUpSubjectCreateNestedOneWithoutPapersInput
    publishings?: LevelUpPublishingCreateNestedManyWithoutPaperInput
  }

  export type LevelUpPaperUncheckedCreateWithoutQuestionsInput = {
    id?: string
    title: string
    subjectCode: string
    classLevel: string
    durationMinutes?: number
    totalQuestions?: number
    totalMarks?: number
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    publishings?: LevelUpPublishingUncheckedCreateNestedManyWithoutPaperInput
  }

  export type LevelUpPaperCreateOrConnectWithoutQuestionsInput = {
    where: LevelUpPaperWhereUniqueInput
    create: XOR<LevelUpPaperCreateWithoutQuestionsInput, LevelUpPaperUncheckedCreateWithoutQuestionsInput>
  }

  export type LevelUpQuestionCreateWithoutPaperLinksInput = {
    id?: string
    classLevel: string
    questionText: string
    difficulty?: string
    correctOption: string
    explanation?: string | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    subject: LevelUpSubjectCreateNestedOneWithoutQuestionsInput
    options?: LevelUpQuestionOptionCreateNestedManyWithoutQuestionInput
  }

  export type LevelUpQuestionUncheckedCreateWithoutPaperLinksInput = {
    id?: string
    subjectCode: string
    classLevel: string
    questionText: string
    difficulty?: string
    correctOption: string
    explanation?: string | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    options?: LevelUpQuestionOptionUncheckedCreateNestedManyWithoutQuestionInput
  }

  export type LevelUpQuestionCreateOrConnectWithoutPaperLinksInput = {
    where: LevelUpQuestionWhereUniqueInput
    create: XOR<LevelUpQuestionCreateWithoutPaperLinksInput, LevelUpQuestionUncheckedCreateWithoutPaperLinksInput>
  }

  export type LevelUpPaperUpsertWithoutQuestionsInput = {
    update: XOR<LevelUpPaperUpdateWithoutQuestionsInput, LevelUpPaperUncheckedUpdateWithoutQuestionsInput>
    create: XOR<LevelUpPaperCreateWithoutQuestionsInput, LevelUpPaperUncheckedCreateWithoutQuestionsInput>
    where?: LevelUpPaperWhereInput
  }

  export type LevelUpPaperUpdateToOneWithWhereWithoutQuestionsInput = {
    where?: LevelUpPaperWhereInput
    data: XOR<LevelUpPaperUpdateWithoutQuestionsInput, LevelUpPaperUncheckedUpdateWithoutQuestionsInput>
  }

  export type LevelUpPaperUpdateWithoutQuestionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    totalQuestions?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subject?: LevelUpSubjectUpdateOneRequiredWithoutPapersNestedInput
    publishings?: LevelUpPublishingUpdateManyWithoutPaperNestedInput
  }

  export type LevelUpPaperUncheckedUpdateWithoutQuestionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    subjectCode?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    totalQuestions?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishings?: LevelUpPublishingUncheckedUpdateManyWithoutPaperNestedInput
  }

  export type LevelUpQuestionUpsertWithoutPaperLinksInput = {
    update: XOR<LevelUpQuestionUpdateWithoutPaperLinksInput, LevelUpQuestionUncheckedUpdateWithoutPaperLinksInput>
    create: XOR<LevelUpQuestionCreateWithoutPaperLinksInput, LevelUpQuestionUncheckedCreateWithoutPaperLinksInput>
    where?: LevelUpQuestionWhereInput
  }

  export type LevelUpQuestionUpdateToOneWithWhereWithoutPaperLinksInput = {
    where?: LevelUpQuestionWhereInput
    data: XOR<LevelUpQuestionUpdateWithoutPaperLinksInput, LevelUpQuestionUncheckedUpdateWithoutPaperLinksInput>
  }

  export type LevelUpQuestionUpdateWithoutPaperLinksInput = {
    id?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    questionText?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    correctOption?: StringFieldUpdateOperationsInput | string
    explanation?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subject?: LevelUpSubjectUpdateOneRequiredWithoutQuestionsNestedInput
    options?: LevelUpQuestionOptionUpdateManyWithoutQuestionNestedInput
  }

  export type LevelUpQuestionUncheckedUpdateWithoutPaperLinksInput = {
    id?: StringFieldUpdateOperationsInput | string
    subjectCode?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    questionText?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    correctOption?: StringFieldUpdateOperationsInput | string
    explanation?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    options?: LevelUpQuestionOptionUncheckedUpdateManyWithoutQuestionNestedInput
  }

  export type LevelUpPaperCreateWithoutPublishingsInput = {
    id?: string
    title: string
    classLevel: string
    durationMinutes?: number
    totalQuestions?: number
    totalMarks?: number
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    subject: LevelUpSubjectCreateNestedOneWithoutPapersInput
    questions?: LevelUpPaperQuestionCreateNestedManyWithoutPaperInput
  }

  export type LevelUpPaperUncheckedCreateWithoutPublishingsInput = {
    id?: string
    title: string
    subjectCode: string
    classLevel: string
    durationMinutes?: number
    totalQuestions?: number
    totalMarks?: number
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    questions?: LevelUpPaperQuestionUncheckedCreateNestedManyWithoutPaperInput
  }

  export type LevelUpPaperCreateOrConnectWithoutPublishingsInput = {
    where: LevelUpPaperWhereUniqueInput
    create: XOR<LevelUpPaperCreateWithoutPublishingsInput, LevelUpPaperUncheckedCreateWithoutPublishingsInput>
  }

  export type LevelUpSubjectCreateWithoutPublishingsInput = {
    code: string
    name: string
    createdAt?: Date | string
    questions?: LevelUpQuestionCreateNestedManyWithoutSubjectInput
    papers?: LevelUpPaperCreateNestedManyWithoutSubjectInput
  }

  export type LevelUpSubjectUncheckedCreateWithoutPublishingsInput = {
    code: string
    name: string
    createdAt?: Date | string
    questions?: LevelUpQuestionUncheckedCreateNestedManyWithoutSubjectInput
    papers?: LevelUpPaperUncheckedCreateNestedManyWithoutSubjectInput
  }

  export type LevelUpSubjectCreateOrConnectWithoutPublishingsInput = {
    where: LevelUpSubjectWhereUniqueInput
    create: XOR<LevelUpSubjectCreateWithoutPublishingsInput, LevelUpSubjectUncheckedCreateWithoutPublishingsInput>
  }

  export type LevelUpAttemptCreateWithoutPublishingInput = {
    id?: string
    studentName: string
    email?: string | null
    schoolName?: string | null
    studentPhone?: string | null
    country?: string | null
    emirateCity?: string | null
    classLevel: string
    curriculum?: string | null
    status?: string
    startedAt?: Date | string
    submittedAt?: Date | string | null
    scoreObtained?: number
    totalMarks?: number
    percentage?: number
    correctCount?: number
    wrongCount?: number
    unansweredCount?: number
    paperSnapshotJson: JsonNullValueInput | InputJsonValue
    resultSnapshotJson?: NullableJsonNullValueInput | InputJsonValue
    sessionTokenHash: string
    createdAt?: Date | string
    updatedAt?: Date | string
    answers?: LevelUpAttemptAnswerCreateNestedManyWithoutAttemptInput
  }

  export type LevelUpAttemptUncheckedCreateWithoutPublishingInput = {
    id?: string
    studentName: string
    email?: string | null
    schoolName?: string | null
    studentPhone?: string | null
    country?: string | null
    emirateCity?: string | null
    classLevel: string
    curriculum?: string | null
    status?: string
    startedAt?: Date | string
    submittedAt?: Date | string | null
    scoreObtained?: number
    totalMarks?: number
    percentage?: number
    correctCount?: number
    wrongCount?: number
    unansweredCount?: number
    paperSnapshotJson: JsonNullValueInput | InputJsonValue
    resultSnapshotJson?: NullableJsonNullValueInput | InputJsonValue
    sessionTokenHash: string
    createdAt?: Date | string
    updatedAt?: Date | string
    answers?: LevelUpAttemptAnswerUncheckedCreateNestedManyWithoutAttemptInput
  }

  export type LevelUpAttemptCreateOrConnectWithoutPublishingInput = {
    where: LevelUpAttemptWhereUniqueInput
    create: XOR<LevelUpAttemptCreateWithoutPublishingInput, LevelUpAttemptUncheckedCreateWithoutPublishingInput>
  }

  export type LevelUpAttemptCreateManyPublishingInputEnvelope = {
    data: LevelUpAttemptCreateManyPublishingInput | LevelUpAttemptCreateManyPublishingInput[]
    skipDuplicates?: boolean
  }

  export type LevelUpPaperUpsertWithoutPublishingsInput = {
    update: XOR<LevelUpPaperUpdateWithoutPublishingsInput, LevelUpPaperUncheckedUpdateWithoutPublishingsInput>
    create: XOR<LevelUpPaperCreateWithoutPublishingsInput, LevelUpPaperUncheckedCreateWithoutPublishingsInput>
    where?: LevelUpPaperWhereInput
  }

  export type LevelUpPaperUpdateToOneWithWhereWithoutPublishingsInput = {
    where?: LevelUpPaperWhereInput
    data: XOR<LevelUpPaperUpdateWithoutPublishingsInput, LevelUpPaperUncheckedUpdateWithoutPublishingsInput>
  }

  export type LevelUpPaperUpdateWithoutPublishingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    totalQuestions?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subject?: LevelUpSubjectUpdateOneRequiredWithoutPapersNestedInput
    questions?: LevelUpPaperQuestionUpdateManyWithoutPaperNestedInput
  }

  export type LevelUpPaperUncheckedUpdateWithoutPublishingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    subjectCode?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    totalQuestions?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    questions?: LevelUpPaperQuestionUncheckedUpdateManyWithoutPaperNestedInput
  }

  export type LevelUpSubjectUpsertWithoutPublishingsInput = {
    update: XOR<LevelUpSubjectUpdateWithoutPublishingsInput, LevelUpSubjectUncheckedUpdateWithoutPublishingsInput>
    create: XOR<LevelUpSubjectCreateWithoutPublishingsInput, LevelUpSubjectUncheckedCreateWithoutPublishingsInput>
    where?: LevelUpSubjectWhereInput
  }

  export type LevelUpSubjectUpdateToOneWithWhereWithoutPublishingsInput = {
    where?: LevelUpSubjectWhereInput
    data: XOR<LevelUpSubjectUpdateWithoutPublishingsInput, LevelUpSubjectUncheckedUpdateWithoutPublishingsInput>
  }

  export type LevelUpSubjectUpdateWithoutPublishingsInput = {
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    questions?: LevelUpQuestionUpdateManyWithoutSubjectNestedInput
    papers?: LevelUpPaperUpdateManyWithoutSubjectNestedInput
  }

  export type LevelUpSubjectUncheckedUpdateWithoutPublishingsInput = {
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    questions?: LevelUpQuestionUncheckedUpdateManyWithoutSubjectNestedInput
    papers?: LevelUpPaperUncheckedUpdateManyWithoutSubjectNestedInput
  }

  export type LevelUpAttemptUpsertWithWhereUniqueWithoutPublishingInput = {
    where: LevelUpAttemptWhereUniqueInput
    update: XOR<LevelUpAttemptUpdateWithoutPublishingInput, LevelUpAttemptUncheckedUpdateWithoutPublishingInput>
    create: XOR<LevelUpAttemptCreateWithoutPublishingInput, LevelUpAttemptUncheckedCreateWithoutPublishingInput>
  }

  export type LevelUpAttemptUpdateWithWhereUniqueWithoutPublishingInput = {
    where: LevelUpAttemptWhereUniqueInput
    data: XOR<LevelUpAttemptUpdateWithoutPublishingInput, LevelUpAttemptUncheckedUpdateWithoutPublishingInput>
  }

  export type LevelUpAttemptUpdateManyWithWhereWithoutPublishingInput = {
    where: LevelUpAttemptScalarWhereInput
    data: XOR<LevelUpAttemptUpdateManyMutationInput, LevelUpAttemptUncheckedUpdateManyWithoutPublishingInput>
  }

  export type LevelUpAttemptScalarWhereInput = {
    AND?: LevelUpAttemptScalarWhereInput | LevelUpAttemptScalarWhereInput[]
    OR?: LevelUpAttemptScalarWhereInput[]
    NOT?: LevelUpAttemptScalarWhereInput | LevelUpAttemptScalarWhereInput[]
    id?: StringFilter<"LevelUpAttempt"> | string
    publishingId?: StringFilter<"LevelUpAttempt"> | string
    studentName?: StringFilter<"LevelUpAttempt"> | string
    email?: StringNullableFilter<"LevelUpAttempt"> | string | null
    schoolName?: StringNullableFilter<"LevelUpAttempt"> | string | null
    studentPhone?: StringNullableFilter<"LevelUpAttempt"> | string | null
    country?: StringNullableFilter<"LevelUpAttempt"> | string | null
    emirateCity?: StringNullableFilter<"LevelUpAttempt"> | string | null
    classLevel?: StringFilter<"LevelUpAttempt"> | string
    curriculum?: StringNullableFilter<"LevelUpAttempt"> | string | null
    status?: StringFilter<"LevelUpAttempt"> | string
    startedAt?: DateTimeFilter<"LevelUpAttempt"> | Date | string
    submittedAt?: DateTimeNullableFilter<"LevelUpAttempt"> | Date | string | null
    scoreObtained?: IntFilter<"LevelUpAttempt"> | number
    totalMarks?: IntFilter<"LevelUpAttempt"> | number
    percentage?: IntFilter<"LevelUpAttempt"> | number
    correctCount?: IntFilter<"LevelUpAttempt"> | number
    wrongCount?: IntFilter<"LevelUpAttempt"> | number
    unansweredCount?: IntFilter<"LevelUpAttempt"> | number
    paperSnapshotJson?: JsonFilter<"LevelUpAttempt">
    resultSnapshotJson?: JsonNullableFilter<"LevelUpAttempt">
    sessionTokenHash?: StringFilter<"LevelUpAttempt"> | string
    createdAt?: DateTimeFilter<"LevelUpAttempt"> | Date | string
    updatedAt?: DateTimeFilter<"LevelUpAttempt"> | Date | string
  }

  export type LevelUpPublishingCreateWithoutAttemptsInput = {
    id?: string
    slug: string
    title: string
    classLevel: string
    durationMinutes: number
    startAt: Date | string
    endAt: Date | string
    isActive?: boolean
    createdAt?: Date | string
    paper: LevelUpPaperCreateNestedOneWithoutPublishingsInput
    subject: LevelUpSubjectCreateNestedOneWithoutPublishingsInput
  }

  export type LevelUpPublishingUncheckedCreateWithoutAttemptsInput = {
    id?: string
    slug: string
    title: string
    paperId: string
    classLevel: string
    subjectCode: string
    durationMinutes: number
    startAt: Date | string
    endAt: Date | string
    isActive?: boolean
    createdAt?: Date | string
  }

  export type LevelUpPublishingCreateOrConnectWithoutAttemptsInput = {
    where: LevelUpPublishingWhereUniqueInput
    create: XOR<LevelUpPublishingCreateWithoutAttemptsInput, LevelUpPublishingUncheckedCreateWithoutAttemptsInput>
  }

  export type LevelUpAttemptAnswerCreateWithoutAttemptInput = {
    id?: string
    questionId: string
    selectedOption: string
    answeredAt?: Date | string
  }

  export type LevelUpAttemptAnswerUncheckedCreateWithoutAttemptInput = {
    id?: string
    questionId: string
    selectedOption: string
    answeredAt?: Date | string
  }

  export type LevelUpAttemptAnswerCreateOrConnectWithoutAttemptInput = {
    where: LevelUpAttemptAnswerWhereUniqueInput
    create: XOR<LevelUpAttemptAnswerCreateWithoutAttemptInput, LevelUpAttemptAnswerUncheckedCreateWithoutAttemptInput>
  }

  export type LevelUpAttemptAnswerCreateManyAttemptInputEnvelope = {
    data: LevelUpAttemptAnswerCreateManyAttemptInput | LevelUpAttemptAnswerCreateManyAttemptInput[]
    skipDuplicates?: boolean
  }

  export type LevelUpPublishingUpsertWithoutAttemptsInput = {
    update: XOR<LevelUpPublishingUpdateWithoutAttemptsInput, LevelUpPublishingUncheckedUpdateWithoutAttemptsInput>
    create: XOR<LevelUpPublishingCreateWithoutAttemptsInput, LevelUpPublishingUncheckedCreateWithoutAttemptsInput>
    where?: LevelUpPublishingWhereInput
  }

  export type LevelUpPublishingUpdateToOneWithWhereWithoutAttemptsInput = {
    where?: LevelUpPublishingWhereInput
    data: XOR<LevelUpPublishingUpdateWithoutAttemptsInput, LevelUpPublishingUncheckedUpdateWithoutAttemptsInput>
  }

  export type LevelUpPublishingUpdateWithoutAttemptsInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    paper?: LevelUpPaperUpdateOneRequiredWithoutPublishingsNestedInput
    subject?: LevelUpSubjectUpdateOneRequiredWithoutPublishingsNestedInput
  }

  export type LevelUpPublishingUncheckedUpdateWithoutAttemptsInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    paperId?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    subjectCode?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpAttemptAnswerUpsertWithWhereUniqueWithoutAttemptInput = {
    where: LevelUpAttemptAnswerWhereUniqueInput
    update: XOR<LevelUpAttemptAnswerUpdateWithoutAttemptInput, LevelUpAttemptAnswerUncheckedUpdateWithoutAttemptInput>
    create: XOR<LevelUpAttemptAnswerCreateWithoutAttemptInput, LevelUpAttemptAnswerUncheckedCreateWithoutAttemptInput>
  }

  export type LevelUpAttemptAnswerUpdateWithWhereUniqueWithoutAttemptInput = {
    where: LevelUpAttemptAnswerWhereUniqueInput
    data: XOR<LevelUpAttemptAnswerUpdateWithoutAttemptInput, LevelUpAttemptAnswerUncheckedUpdateWithoutAttemptInput>
  }

  export type LevelUpAttemptAnswerUpdateManyWithWhereWithoutAttemptInput = {
    where: LevelUpAttemptAnswerScalarWhereInput
    data: XOR<LevelUpAttemptAnswerUpdateManyMutationInput, LevelUpAttemptAnswerUncheckedUpdateManyWithoutAttemptInput>
  }

  export type LevelUpAttemptAnswerScalarWhereInput = {
    AND?: LevelUpAttemptAnswerScalarWhereInput | LevelUpAttemptAnswerScalarWhereInput[]
    OR?: LevelUpAttemptAnswerScalarWhereInput[]
    NOT?: LevelUpAttemptAnswerScalarWhereInput | LevelUpAttemptAnswerScalarWhereInput[]
    id?: StringFilter<"LevelUpAttemptAnswer"> | string
    attemptId?: StringFilter<"LevelUpAttemptAnswer"> | string
    questionId?: StringFilter<"LevelUpAttemptAnswer"> | string
    selectedOption?: StringFilter<"LevelUpAttemptAnswer"> | string
    answeredAt?: DateTimeFilter<"LevelUpAttemptAnswer"> | Date | string
  }

  export type LevelUpAttemptCreateWithoutAnswersInput = {
    id?: string
    studentName: string
    email?: string | null
    schoolName?: string | null
    studentPhone?: string | null
    country?: string | null
    emirateCity?: string | null
    classLevel: string
    curriculum?: string | null
    status?: string
    startedAt?: Date | string
    submittedAt?: Date | string | null
    scoreObtained?: number
    totalMarks?: number
    percentage?: number
    correctCount?: number
    wrongCount?: number
    unansweredCount?: number
    paperSnapshotJson: JsonNullValueInput | InputJsonValue
    resultSnapshotJson?: NullableJsonNullValueInput | InputJsonValue
    sessionTokenHash: string
    createdAt?: Date | string
    updatedAt?: Date | string
    publishing: LevelUpPublishingCreateNestedOneWithoutAttemptsInput
  }

  export type LevelUpAttemptUncheckedCreateWithoutAnswersInput = {
    id?: string
    publishingId: string
    studentName: string
    email?: string | null
    schoolName?: string | null
    studentPhone?: string | null
    country?: string | null
    emirateCity?: string | null
    classLevel: string
    curriculum?: string | null
    status?: string
    startedAt?: Date | string
    submittedAt?: Date | string | null
    scoreObtained?: number
    totalMarks?: number
    percentage?: number
    correctCount?: number
    wrongCount?: number
    unansweredCount?: number
    paperSnapshotJson: JsonNullValueInput | InputJsonValue
    resultSnapshotJson?: NullableJsonNullValueInput | InputJsonValue
    sessionTokenHash: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type LevelUpAttemptCreateOrConnectWithoutAnswersInput = {
    where: LevelUpAttemptWhereUniqueInput
    create: XOR<LevelUpAttemptCreateWithoutAnswersInput, LevelUpAttemptUncheckedCreateWithoutAnswersInput>
  }

  export type LevelUpAttemptUpsertWithoutAnswersInput = {
    update: XOR<LevelUpAttemptUpdateWithoutAnswersInput, LevelUpAttemptUncheckedUpdateWithoutAnswersInput>
    create: XOR<LevelUpAttemptCreateWithoutAnswersInput, LevelUpAttemptUncheckedCreateWithoutAnswersInput>
    where?: LevelUpAttemptWhereInput
  }

  export type LevelUpAttemptUpdateToOneWithWhereWithoutAnswersInput = {
    where?: LevelUpAttemptWhereInput
    data: XOR<LevelUpAttemptUpdateWithoutAnswersInput, LevelUpAttemptUncheckedUpdateWithoutAnswersInput>
  }

  export type LevelUpAttemptUpdateWithoutAnswersInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    schoolName?: NullableStringFieldUpdateOperationsInput | string | null
    studentPhone?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    emirateCity?: NullableStringFieldUpdateOperationsInput | string | null
    classLevel?: StringFieldUpdateOperationsInput | string
    curriculum?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scoreObtained?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    percentage?: IntFieldUpdateOperationsInput | number
    correctCount?: IntFieldUpdateOperationsInput | number
    wrongCount?: IntFieldUpdateOperationsInput | number
    unansweredCount?: IntFieldUpdateOperationsInput | number
    paperSnapshotJson?: JsonNullValueInput | InputJsonValue
    resultSnapshotJson?: NullableJsonNullValueInput | InputJsonValue
    sessionTokenHash?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishing?: LevelUpPublishingUpdateOneRequiredWithoutAttemptsNestedInput
  }

  export type LevelUpAttemptUncheckedUpdateWithoutAnswersInput = {
    id?: StringFieldUpdateOperationsInput | string
    publishingId?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    schoolName?: NullableStringFieldUpdateOperationsInput | string | null
    studentPhone?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    emirateCity?: NullableStringFieldUpdateOperationsInput | string | null
    classLevel?: StringFieldUpdateOperationsInput | string
    curriculum?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scoreObtained?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    percentage?: IntFieldUpdateOperationsInput | number
    correctCount?: IntFieldUpdateOperationsInput | number
    wrongCount?: IntFieldUpdateOperationsInput | number
    unansweredCount?: IntFieldUpdateOperationsInput | number
    paperSnapshotJson?: JsonNullValueInput | InputJsonValue
    resultSnapshotJson?: NullableJsonNullValueInput | InputJsonValue
    sessionTokenHash?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpQuestionCreateManySubjectInput = {
    id?: string
    classLevel: string
    questionText: string
    difficulty?: string
    correctOption: string
    explanation?: string | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type LevelUpPaperCreateManySubjectInput = {
    id?: string
    title: string
    classLevel: string
    durationMinutes?: number
    totalQuestions?: number
    totalMarks?: number
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type LevelUpPublishingCreateManySubjectInput = {
    id?: string
    slug: string
    title: string
    paperId: string
    classLevel: string
    durationMinutes: number
    startAt: Date | string
    endAt: Date | string
    isActive?: boolean
    createdAt?: Date | string
  }

  export type LevelUpQuestionUpdateWithoutSubjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    questionText?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    correctOption?: StringFieldUpdateOperationsInput | string
    explanation?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    options?: LevelUpQuestionOptionUpdateManyWithoutQuestionNestedInput
    paperLinks?: LevelUpPaperQuestionUpdateManyWithoutQuestionNestedInput
  }

  export type LevelUpQuestionUncheckedUpdateWithoutSubjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    questionText?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    correctOption?: StringFieldUpdateOperationsInput | string
    explanation?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    options?: LevelUpQuestionOptionUncheckedUpdateManyWithoutQuestionNestedInput
    paperLinks?: LevelUpPaperQuestionUncheckedUpdateManyWithoutQuestionNestedInput
  }

  export type LevelUpQuestionUncheckedUpdateManyWithoutSubjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    questionText?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    correctOption?: StringFieldUpdateOperationsInput | string
    explanation?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpPaperUpdateWithoutSubjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    totalQuestions?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    questions?: LevelUpPaperQuestionUpdateManyWithoutPaperNestedInput
    publishings?: LevelUpPublishingUpdateManyWithoutPaperNestedInput
  }

  export type LevelUpPaperUncheckedUpdateWithoutSubjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    totalQuestions?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    questions?: LevelUpPaperQuestionUncheckedUpdateManyWithoutPaperNestedInput
    publishings?: LevelUpPublishingUncheckedUpdateManyWithoutPaperNestedInput
  }

  export type LevelUpPaperUncheckedUpdateManyWithoutSubjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    totalQuestions?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpPublishingUpdateWithoutSubjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    paper?: LevelUpPaperUpdateOneRequiredWithoutPublishingsNestedInput
    attempts?: LevelUpAttemptUpdateManyWithoutPublishingNestedInput
  }

  export type LevelUpPublishingUncheckedUpdateWithoutSubjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    paperId?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attempts?: LevelUpAttemptUncheckedUpdateManyWithoutPublishingNestedInput
  }

  export type LevelUpPublishingUncheckedUpdateManyWithoutSubjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    paperId?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpQuestionOptionCreateManyQuestionInput = {
    id?: string
    optionKey: string
    optionText: string
    displayOrder: number
  }

  export type LevelUpPaperQuestionCreateManyQuestionInput = {
    id?: string
    paperId: string
    displayOrder: number
    marks?: number
  }

  export type LevelUpQuestionOptionUpdateWithoutQuestionInput = {
    id?: StringFieldUpdateOperationsInput | string
    optionKey?: StringFieldUpdateOperationsInput | string
    optionText?: StringFieldUpdateOperationsInput | string
    displayOrder?: IntFieldUpdateOperationsInput | number
  }

  export type LevelUpQuestionOptionUncheckedUpdateWithoutQuestionInput = {
    id?: StringFieldUpdateOperationsInput | string
    optionKey?: StringFieldUpdateOperationsInput | string
    optionText?: StringFieldUpdateOperationsInput | string
    displayOrder?: IntFieldUpdateOperationsInput | number
  }

  export type LevelUpQuestionOptionUncheckedUpdateManyWithoutQuestionInput = {
    id?: StringFieldUpdateOperationsInput | string
    optionKey?: StringFieldUpdateOperationsInput | string
    optionText?: StringFieldUpdateOperationsInput | string
    displayOrder?: IntFieldUpdateOperationsInput | number
  }

  export type LevelUpPaperQuestionUpdateWithoutQuestionInput = {
    id?: StringFieldUpdateOperationsInput | string
    displayOrder?: IntFieldUpdateOperationsInput | number
    marks?: IntFieldUpdateOperationsInput | number
    paper?: LevelUpPaperUpdateOneRequiredWithoutQuestionsNestedInput
  }

  export type LevelUpPaperQuestionUncheckedUpdateWithoutQuestionInput = {
    id?: StringFieldUpdateOperationsInput | string
    paperId?: StringFieldUpdateOperationsInput | string
    displayOrder?: IntFieldUpdateOperationsInput | number
    marks?: IntFieldUpdateOperationsInput | number
  }

  export type LevelUpPaperQuestionUncheckedUpdateManyWithoutQuestionInput = {
    id?: StringFieldUpdateOperationsInput | string
    paperId?: StringFieldUpdateOperationsInput | string
    displayOrder?: IntFieldUpdateOperationsInput | number
    marks?: IntFieldUpdateOperationsInput | number
  }

  export type LevelUpPaperQuestionCreateManyPaperInput = {
    id?: string
    questionId: string
    displayOrder: number
    marks?: number
  }

  export type LevelUpPublishingCreateManyPaperInput = {
    id?: string
    slug: string
    title: string
    classLevel: string
    subjectCode: string
    durationMinutes: number
    startAt: Date | string
    endAt: Date | string
    isActive?: boolean
    createdAt?: Date | string
  }

  export type LevelUpPaperQuestionUpdateWithoutPaperInput = {
    id?: StringFieldUpdateOperationsInput | string
    displayOrder?: IntFieldUpdateOperationsInput | number
    marks?: IntFieldUpdateOperationsInput | number
    question?: LevelUpQuestionUpdateOneRequiredWithoutPaperLinksNestedInput
  }

  export type LevelUpPaperQuestionUncheckedUpdateWithoutPaperInput = {
    id?: StringFieldUpdateOperationsInput | string
    questionId?: StringFieldUpdateOperationsInput | string
    displayOrder?: IntFieldUpdateOperationsInput | number
    marks?: IntFieldUpdateOperationsInput | number
  }

  export type LevelUpPaperQuestionUncheckedUpdateManyWithoutPaperInput = {
    id?: StringFieldUpdateOperationsInput | string
    questionId?: StringFieldUpdateOperationsInput | string
    displayOrder?: IntFieldUpdateOperationsInput | number
    marks?: IntFieldUpdateOperationsInput | number
  }

  export type LevelUpPublishingUpdateWithoutPaperInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subject?: LevelUpSubjectUpdateOneRequiredWithoutPublishingsNestedInput
    attempts?: LevelUpAttemptUpdateManyWithoutPublishingNestedInput
  }

  export type LevelUpPublishingUncheckedUpdateWithoutPaperInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    subjectCode?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attempts?: LevelUpAttemptUncheckedUpdateManyWithoutPublishingNestedInput
  }

  export type LevelUpPublishingUncheckedUpdateManyWithoutPaperInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    classLevel?: StringFieldUpdateOperationsInput | string
    subjectCode?: StringFieldUpdateOperationsInput | string
    durationMinutes?: IntFieldUpdateOperationsInput | number
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpAttemptCreateManyPublishingInput = {
    id?: string
    studentName: string
    email?: string | null
    schoolName?: string | null
    studentPhone?: string | null
    country?: string | null
    emirateCity?: string | null
    classLevel: string
    curriculum?: string | null
    status?: string
    startedAt?: Date | string
    submittedAt?: Date | string | null
    scoreObtained?: number
    totalMarks?: number
    percentage?: number
    correctCount?: number
    wrongCount?: number
    unansweredCount?: number
    paperSnapshotJson: JsonNullValueInput | InputJsonValue
    resultSnapshotJson?: NullableJsonNullValueInput | InputJsonValue
    sessionTokenHash: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type LevelUpAttemptUpdateWithoutPublishingInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    schoolName?: NullableStringFieldUpdateOperationsInput | string | null
    studentPhone?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    emirateCity?: NullableStringFieldUpdateOperationsInput | string | null
    classLevel?: StringFieldUpdateOperationsInput | string
    curriculum?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scoreObtained?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    percentage?: IntFieldUpdateOperationsInput | number
    correctCount?: IntFieldUpdateOperationsInput | number
    wrongCount?: IntFieldUpdateOperationsInput | number
    unansweredCount?: IntFieldUpdateOperationsInput | number
    paperSnapshotJson?: JsonNullValueInput | InputJsonValue
    resultSnapshotJson?: NullableJsonNullValueInput | InputJsonValue
    sessionTokenHash?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    answers?: LevelUpAttemptAnswerUpdateManyWithoutAttemptNestedInput
  }

  export type LevelUpAttemptUncheckedUpdateWithoutPublishingInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    schoolName?: NullableStringFieldUpdateOperationsInput | string | null
    studentPhone?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    emirateCity?: NullableStringFieldUpdateOperationsInput | string | null
    classLevel?: StringFieldUpdateOperationsInput | string
    curriculum?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scoreObtained?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    percentage?: IntFieldUpdateOperationsInput | number
    correctCount?: IntFieldUpdateOperationsInput | number
    wrongCount?: IntFieldUpdateOperationsInput | number
    unansweredCount?: IntFieldUpdateOperationsInput | number
    paperSnapshotJson?: JsonNullValueInput | InputJsonValue
    resultSnapshotJson?: NullableJsonNullValueInput | InputJsonValue
    sessionTokenHash?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    answers?: LevelUpAttemptAnswerUncheckedUpdateManyWithoutAttemptNestedInput
  }

  export type LevelUpAttemptUncheckedUpdateManyWithoutPublishingInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    schoolName?: NullableStringFieldUpdateOperationsInput | string | null
    studentPhone?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    emirateCity?: NullableStringFieldUpdateOperationsInput | string | null
    classLevel?: StringFieldUpdateOperationsInput | string
    curriculum?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    submittedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scoreObtained?: IntFieldUpdateOperationsInput | number
    totalMarks?: IntFieldUpdateOperationsInput | number
    percentage?: IntFieldUpdateOperationsInput | number
    correctCount?: IntFieldUpdateOperationsInput | number
    wrongCount?: IntFieldUpdateOperationsInput | number
    unansweredCount?: IntFieldUpdateOperationsInput | number
    paperSnapshotJson?: JsonNullValueInput | InputJsonValue
    resultSnapshotJson?: NullableJsonNullValueInput | InputJsonValue
    sessionTokenHash?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpAttemptAnswerCreateManyAttemptInput = {
    id?: string
    questionId: string
    selectedOption: string
    answeredAt?: Date | string
  }

  export type LevelUpAttemptAnswerUpdateWithoutAttemptInput = {
    id?: StringFieldUpdateOperationsInput | string
    questionId?: StringFieldUpdateOperationsInput | string
    selectedOption?: StringFieldUpdateOperationsInput | string
    answeredAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpAttemptAnswerUncheckedUpdateWithoutAttemptInput = {
    id?: StringFieldUpdateOperationsInput | string
    questionId?: StringFieldUpdateOperationsInput | string
    selectedOption?: StringFieldUpdateOperationsInput | string
    answeredAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LevelUpAttemptAnswerUncheckedUpdateManyWithoutAttemptInput = {
    id?: StringFieldUpdateOperationsInput | string
    questionId?: StringFieldUpdateOperationsInput | string
    selectedOption?: StringFieldUpdateOperationsInput | string
    answeredAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use LevelUpSubjectCountOutputTypeDefaultArgs instead
     */
    export type LevelUpSubjectCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = LevelUpSubjectCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use LevelUpQuestionCountOutputTypeDefaultArgs instead
     */
    export type LevelUpQuestionCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = LevelUpQuestionCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use LevelUpPaperCountOutputTypeDefaultArgs instead
     */
    export type LevelUpPaperCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = LevelUpPaperCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use LevelUpPublishingCountOutputTypeDefaultArgs instead
     */
    export type LevelUpPublishingCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = LevelUpPublishingCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use LevelUpAttemptCountOutputTypeDefaultArgs instead
     */
    export type LevelUpAttemptCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = LevelUpAttemptCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use LevelUpSubjectDefaultArgs instead
     */
    export type LevelUpSubjectArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = LevelUpSubjectDefaultArgs<ExtArgs>
    /**
     * @deprecated Use LevelUpQuestionDefaultArgs instead
     */
    export type LevelUpQuestionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = LevelUpQuestionDefaultArgs<ExtArgs>
    /**
     * @deprecated Use LevelUpQuestionOptionDefaultArgs instead
     */
    export type LevelUpQuestionOptionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = LevelUpQuestionOptionDefaultArgs<ExtArgs>
    /**
     * @deprecated Use LevelUpPaperDefaultArgs instead
     */
    export type LevelUpPaperArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = LevelUpPaperDefaultArgs<ExtArgs>
    /**
     * @deprecated Use LevelUpPaperQuestionDefaultArgs instead
     */
    export type LevelUpPaperQuestionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = LevelUpPaperQuestionDefaultArgs<ExtArgs>
    /**
     * @deprecated Use LevelUpPublishingDefaultArgs instead
     */
    export type LevelUpPublishingArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = LevelUpPublishingDefaultArgs<ExtArgs>
    /**
     * @deprecated Use LevelUpRegistrationDefaultArgs instead
     */
    export type LevelUpRegistrationArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = LevelUpRegistrationDefaultArgs<ExtArgs>
    /**
     * @deprecated Use LevelUpAttemptDefaultArgs instead
     */
    export type LevelUpAttemptArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = LevelUpAttemptDefaultArgs<ExtArgs>
    /**
     * @deprecated Use LevelUpAttemptAnswerDefaultArgs instead
     */
    export type LevelUpAttemptAnswerArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = LevelUpAttemptAnswerDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}