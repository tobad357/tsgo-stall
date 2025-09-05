import { ZodObject} from "zod";
import type { NestedZodKeysWithTypes } from "./crud-zod-type-utils.js";

// If you either comment out TFilterKeys or the wrapping createCrudRouter function
// then both tsc and tsgo finish almost instantly.
// If you leave both in, tsc finishes almost instantly, but tsgo takes forever
const createCrudRouterWrapper = (() => {

	function createCrudRouter<
		T extends ZodObject<any, any>,
		TFilterKeys extends (keyof NestedZodKeysWithTypes<T>["shape"])[] = [],
	>(): any {
		return "<router>";
	}

	return createCrudRouter;

})();

export { createCrudRouterWrapper };
