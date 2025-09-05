/**
 * Flattens the type `T` to simplify its structure and make it more readable.
 *
 * @example
 * type Original = { a: number } & { b: string };
 * type Merged = Merge<Original>; // { a: number; b: string }
 */
export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

/**
 * Converts a union type `U` into an intersection of all the types in `U`.
 *
 * @example
 * type Union = { a: string } | { b: number };
 * type Intersection = UnionToIntersection<Union>; // { a: string } & { b: number }
 */
export type UnionToIntersection<U> = Prettify<(U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never>;

/**
 * Flattens the type `T` to simplify its structure and make it more readable.
 *
 * @example
 * type Original = { a: number } & { b: string };
 * type Merged = Merge<Original>; // { a: number; b: string }
 */
export type Merge<T> = {
	[K in keyof T]: T[K];
};

/**
 * Extracts the keys of a given type `T` that are of type `string`.
 *
 * This utility type is useful when you need to work with only the string keys of an object type.
 *
 * @template T - The type from which to extract the string keys.
 * @returns The keys of `T` that are of type `string`.
 */
export type StringKeys<T> = Extract<keyof T, string>;

/**
 * A utility type that flattens an array type to its element type.
 * If the given type `T` is an array, it extracts and returns the type of the array's elements.
 * Otherwise, it returns the type `T` itself.
 *
 * @template T - The type to be flattened.
 */
export type Flatten<T> = T extends Array<infer U> ? U : T;

/**
 * Given a object
 * {
 *   prop1: never,
 *   prop2: string
 * }
 * we will get
 * {
 *   prop2: string
 * }
 */
export type NonNeverKeys<T> = {
	[K in keyof T as T[K] extends never ? never : K]: K;
};
