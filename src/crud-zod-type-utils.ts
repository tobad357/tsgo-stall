/**
 * Overview:
 * This file provides various TypeScript utility types and functions to work with Zod schemas for the ts-rest API,
 * this is for flattening, merging, and extracting nested properties. The utilities are designed to simplify and manipulate Zod object schemas,
 * making it easier to work with complex nested structures by flattening them, extracting keys, or merging schemas.
 */

import { DateTime } from "luxon";
import {
	ZodArray,
	ZodBoolean,
	ZodDate,
	ZodEnum,
	ZodLiteral,
	ZodNever,
	ZodNullable,
	ZodNumber,
	ZodObject,
	ZodOptional,
	ZodRecord,
	ZodString,
	ZodType,
	ZodUnion,
	core,
	z,
} from "zod";
import { util } from "zod/v4/core";
import type { NonNeverKeys, Prettify, UnionToIntersection } from "./type-utils.js";

/**
 * Unwrap a Zod type from Nullable and Optional wrappers
 * to get he underlying type
 */
type UnwrapZodType<T> = T extends ZodOptional<infer U> ? UnwrapZodType<U> : T extends ZodNullable<infer U> ? UnwrapZodType<U> : T;

/**
 * Recursively flattens a Zod object schema `T`, creating a type where all nested properties are flattened
 * with their keys concatenated using underscores.
 *
 * @example
 * const schema = z.object({
 *   a: z.string(),
 *   b: z.object({
 *     c: z.number(),
 *   }),
 * });
 * type Flattened = FlattenZodObjectWithTypes<typeof schema>;
 * // { a: ZodString; b_c: ZodNumber }
 */
type Increment<N extends number> = [...Array<N>, 0]["length"];

export type FlattenZodObjectWithTypes<T extends z.ZodObject<any, any>, Path extends string = "", Depth extends number = 0> = Depth extends 1
	? { [K in Path]: z.ZodTypeAny } // Or just `never` or base fields depending on use
	: T extends ZodObject<infer Shape>
		? UnionToIntersection<
				{
					[K in keyof T["shape"] & string]: FlattenZodFieldWithTypes<T["shape"][K], `${Path}${K}`, Increment<Depth>>;
				}[keyof Shape & string]
			>
		: never;

// = T extends ZodObject<infer Shape>
// 	? UnionToIntersection<
// 			{
// 				[K in keyof T["shape"] & string]: FlattenZodFieldWithTypes<T["shape"][K], `${Path}${K}`, Increment<Depth>>;
// 			}[keyof Shape & string]
// 		>
// 	: never;

// Example / Test case for FlattenZodObjectWithTypes
const obj = z.object({
	foo: z.string(),
	bar: z.object({
		baz: z.number(),
	}),
	zoo: z.string().optional(),
	cas: z.number().nullable(),
	qux: z.union([z.string(), z.number()]),
});


type FlattenZodFieldWithTypes<T extends ZodType, Path extends string, Depth extends number> = Depth extends 1
	? { [K in Path]: QueryTypes<T> }
	: T extends ZodOptional<infer Inner>
		? Inner extends ZodType
			? FlattenZodFieldWithTypes<Inner, Path, Depth>
			: never
		: T extends ZodNullable<infer Inner>
			? Inner extends ZodType
				? FlattenZodFieldWithTypes<Inner, Path, Depth>
				: never
			: T extends ZodObject<any>
				? FlattenZodObjectWithTypes<T, `${Path}_`, Depth>
				: T extends ZodUnion<infer Options>
					? Options[number] extends ZodObject<any>
						? UnionToIntersection<FlattenUnionObjects<Options[number], `${Path}_`, Increment<Depth>>>
						: { [K in Path]: QueryTypes<T> }
					: { [K in Path]: QueryTypes<T> };

type FlattenUnionObjects<T, Path extends string, Depth extends number> = T extends z.ZodObject<any, any>
	? FlattenZodObjectWithTypes<T, Path, Depth>
	: { [Key in Path]: T };

type MergeFlattened<T extends z.ZodObject<any, any>> = UnionToIntersection<FlattenZodObjectWithTypes<T>>;

type ZodShape<T> = Prettify<{
	[K in keyof T]: T[K] extends z.ZodObject<any, any> ? T[K] : T[K] extends ZodType ? T[K] : never;
}>;

/**
 * We want to convert Zod to types for our query language
 * This includes
 * 1. Add option to passin an array of values
 * 2. Convert DateTime to JS Date
 * 3. Allow LHS operations
 */
type QueryTypes<T extends ZodType> = z.infer<T> extends DateTime<boolean>
	? ZodUnion<[ZodDate, ZodArray<ZodDate>, typeof LHSDateSchema]>
	: T extends ZodString
		? ZodUnion<[z.ZodString, ZodArray<ZodString>, typeof LHSStringSchema]>
		: T extends ZodNumber
			? ZodUnion<[ZodNumber, ZodArray<ZodNumber>, typeof LHSNumberSchema]>
			: T extends ZodBoolean
				? T
				: ZodUnion<[T, ZodArray<T>]>;

/**
 * Generate sub entities that can be populated based on the Zod object passed in
 */

export type QueryPopulateFieldFilter<T extends z.ZodObject<any, any>> = {
	[K in keyof T["shape"]]: UnwrapZodType<T["shape"][K]> extends ZodObject<infer S extends Record<string, ZodType>>
		? S extends { id: ZodType }
			? K
			: never
		: UnwrapZodType<T["shape"][K]> extends ZodUnion<infer U>
			? U[number] extends ZodObject<infer SUnion extends Record<string, ZodType>>
				? SUnion extends { id: ZodType }
					? K
					: never
				: never
			: never;
};

export type QueryPopulateFields<T extends z.ZodObject<any, any>> = ZodArray<ZodLiteral<keyof NonNeverKeys<QueryPopulateFieldFilter<T>>>>;

export type QueryPopulate<T extends z.ZodObject<any, any>> = ZodUnion<[ZodBoolean, QueryPopulateFields<T>]>;

/**
 * Generate order by object based on the Zod object passed in
 */
export type QueryOptions<
	T extends z.ZodObject<any, any>,
	TOrderByKeys extends (keyof NestedZodKeysWithTypes<T>["shape"])[] = [],
> = ZodObject<{
	orderBy: TOrderByKeys extends []
		? never
		: ZodOptional<
				ZodArray<
					ZodRecord<
						ZodUnion<
							[
								ZodEnum<{
									[K in keyof z.infer<PickZodObjectKeys<NestedZodKeysWithTypes<T>, TOrderByKeys, true>> & string]: K;
								}>,
								ZodNever,
							]
						> &
							core.$partial,
						ZodEnum<{ asc: "asc"; desc: "desc" }>
					>
				>
			>;
	populate: ZodOptional<QueryPopulate<T>>;
}>;

type TestKeys = keyof z.infer<NestedZodKeysWithTypes<typeof obj>> & string;
type EnumObject<K extends string> = {
	[P in K]: P;
};
/**
 * Define LHS Zod object LHS schema for different types
 */
export const LHSDateSchema = z.object({
	in: z.optional(z.array(z.date())),
	notIn: z.optional(z.array(z.date())),
	gt: z.optional(z.date()),
	gte: z.optional(z.date()),
	lt: z.optional(z.date()),
	lte: z.optional(z.date()),
});
export type LHSDateSchema = z.infer<typeof LHSDateSchema>;

export const LHSStringSchema = z.object({
	in: z.optional(z.array(z.string())),
	notIn: z.optional(z.array(z.string())),
	contains: z.optional(z.string()),
	startsWith: z.optional(z.string()),
	endsWith: z.optional(z.string()),
});
export type LHSStringSchema = z.infer<typeof LHSStringSchema>;

export const LHSNumberSchema = z.object({
	in: z.optional(z.array(z.number())),
	notIn: z.optional(z.array(z.number())),
	gt: z.optional(z.number()),
	gte: z.optional(z.number()),
	lt: z.optional(z.number()),
	lte: z.optional(z.number()),
});
export type LHSNumberSchema = z.infer<typeof LHSNumberSchema>;

/**
 * Flattens a Zod object schema `T` into a single type, combining all nested properties into an intersection.
 *
 * @example
 * const schema = z.object({
 *   a: z.string(),
 *   b: z.object({
 *     c: z.number(),
 *   }),
 * });
 * type FlattenedKeys = NestedZodKeysWithTypes<typeof schema>;
 * // { a: ZodString } & { b_c: ZodNumber }
 */
export type NestedZodKeysWithTypes<T extends z.ZodObject<any, any>> = ZodObject<ZodShape<MergeFlattened<T>>, T["_zod"]["config"]>;

/**
 * Extracts a subset of properties from a type `T` based on a list of keys `K`.
 * The resulting type will have the same shape as the original type `T`, but only
 * the properties specified by `K` will be present.
 *
 * @template T - The original type to extract properties from.
 * @template K - An array of keys to extract from the original type `T`.
 * @template Optional - A boolean flag to indicate whether the extracted properties should be optional.
 * @returns A new type with the same shape as `T`, but only containing the properties
 * specified by `K`.
 */
export type PickZodObjectKeys<
	T extends z.ZodObject<any, any>,
	K extends (keyof T["shape"])[],
	Optional extends boolean = false,
> = ZodObject<
	{
		[P in Extract<K[number], keyof T["shape"]>]: Optional extends true ? ZodOptional<T["shape"][P]> : T["shape"][P];
	},
	T["_zod"]["config"]
>;

/**
 * Combines two Zod object schemas into a single object schema the same way as the z.merge function does
 *
 * This type takes two Zod object schemas, `A` and `B`, and merges their properties
 * into a new Zod object schema. The resulting schema will have the same `unknownKeys`
 * and `catchall` properties as the `B` schema.
 *
 * @template A - The first Zod object schema to combine.
 * @template B - The second Zod object schema to combine.
 * @returns A new Zod object schema that combines the properties of `A` and `B`.
 */
export type CombineZodObjects<A extends z.ZodObject<any, any>, B extends z.ZodObject<any, any>> = ZodObject<
	util.Extend<A["shape"], B["shape"]>,
	B["_zod"]["config"]
>;

/**
 * Merges the properties of a Zod object entity with a Zod filter query object.
 *
 * This function flattens the nested shapes of the given Zod object entity, picks the properties
 * specified in the filterProps array, and merges them with the provided Zod filter query object.
 *
 * @example
 * const entitySchema = z.object({ name: z.string(), age: z.number() });
 * const filterProps: (keyof typeof entitySchema.shape)[] = ['name'];
 * const zFilterQuery = z.object({ location: z.string() });
 * const mergedSchema = mergeFilterPropsWithQuery(entitySchema, filterProps, zFilterQuery);
 *
 *
 * @template T - A Zod object type.
 * @param {T} entity - The Zod object entity whose properties are to be merged.
 * @param {(keyof T["shape"])[]} filterProps - An array of keys representing the properties to be picked from the entity.
 * @param {z.ZodObject<any>} zFilterQuery - The Zod filter query object to be merged with the picked properties.
 * @returns {z.ZodObject<any>} - A new Zod object containing the merged properties.
 */
const getFilterSchema = (type: ZodType): ZodType => {
	if (type instanceof ZodString) {
		return z.union([type, z.array(type), LHSStringSchema]);
	}
	if (type instanceof ZodNumber) {
		return z.union([type, z.array(type), LHSNumberSchema]);
	}
	if (type instanceof ZodDate) {
		return z.union([type, z.array(type), LHSDateSchema]);
	}
	return z.union([type, z.array(type)]);
};
