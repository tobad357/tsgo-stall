import type { AppRouter, ContractNullType, ContractPlainType } from "@ts-rest/core";
import { initContract } from "@ts-rest/core";
import { ZodObject, z } from "zod";
import type { NestedZodKeysWithTypes } from "./crud-zod-type-utils.js";

export type BaseRoutes<
	T extends ZodObject<any, any>,
	C extends ZodObject<any, any>,
	U extends ZodObject<any, any>,
	TFilterKeys extends (keyof NestedZodKeysWithTypes<T>["shape"])[] = [],
	TContract extends ContractPlainType<z.output<T>> = ContractPlainType<z.output<T>>,
> = {
	get: {
		method: "GET";
		path: `/${string}/:id`;
		summary: string;
		responses: {
			200: TContract | ContractNullType;
		};
	};
};

export type Metadata = {
	authentication: boolean;
	[key: string]: any;
};

const createCrudRouter = (() => {
	// Create a contract instance locally within the module
	const c = initContract();

	type TCrudRouter<
		T extends ZodObject<any, any>,
		C extends ZodObject<any, any>,
		U extends ZodObject<any, any>,
		TRouter extends AppRouter,
		TFilterKeys extends (keyof NestedZodKeysWithTypes<T>["shape"])[] = [],
	> = ReturnType<typeof c.router<BaseRoutes<T, C, U, TFilterKeys> & TRouter, string, { metadata: Metadata }>>;


	/**
	 * Creates a CRUD router with specified configurations.
	 *
	 * @template T - The Zod schema for the entity.
	 * @template C - The Zod schema for the create operation.
	 * @template U - The Zod schema for the update operation.
	 * @template TRouter - The type of the additional routes.
	 * @template TFilterKeys - The keys to filter by.
	 * @template TOrderByKeys - The keys to order by.
	 *
	 * @param {Object} params - The parameters for creating the CRUD router.
	 * @param {string} params.name - The name of the entity.
	 * @param {T} params.entity - The Zod schema for the entity.
	 * @param {C} params.create - The Zod schema for the create operation.
	 * @param {U} params.update - The Zod schema for the update operation.
	 * @param {TFilterKeys} [params.filterBy] - The keys to filter by.
	 * @param {TRouter} [params.routes] - Additional routes to include in ts-rest AppRoute format.
	 * @param {boolean} [params.authentication=true] - Whether authentication is required.
	 * @param {Record<string, any>} [params.metadata={}] - Additional metadata for the routes.
	 *
	 * @returns {TCrudRouter<T, C, U, TRouter, TFilterKeys>} The configured CRUD router.
	 */
	function createCrudRouter<
		T extends ZodObject<any, any>,
		C extends ZodObject<any, any>,
		U extends ZodObject<any, any>,
		TRouter extends AppRouter,
		TFilterKeys extends (keyof NestedZodKeysWithTypes<T>["shape"])[] = [],
	>({
		name,
		routes,
		authentication = true,
		metadata = {},
	}: {
		name: string;
		entity: T;
		create: C;
		update: U;
		filterBy?: TFilterKeys;
		routes?: TRouter;
		authentication?: boolean;
		metadata?: Record<string, any>;
	}): TCrudRouter<T, C, U, TRouter, TFilterKeys> {
		type BaseImpl = BaseRoutes<T, C, U, TFilterKeys>;

		type TType = z.output<T>;
		const CTType = c.type<TType>();

		const baseRoutes: BaseImpl = {
			get: {
				method: "GET",
				path: `/${name}/:id`,
				summary: `Get ${name} by id`,
				responses: {
					200: CTType,
				},
			}
		} satisfies BaseImpl;

		const mergedRoutes: BaseImpl & TRouter = {
			...baseRoutes,
			...(routes ?? {}),
		} as BaseRoutes<T, C, U, TFilterKeys> & TRouter;

		const ret: TCrudRouter<T, C, U, TRouter, TFilterKeys> = c.router(mergedRoutes, {
			metadata: { authentication, ...metadata },
		}) as unknown as TCrudRouter<T, C, U, TRouter, TFilterKeys>;

		return ret;
	}

	return createCrudRouter;
})();

export { createCrudRouter };
