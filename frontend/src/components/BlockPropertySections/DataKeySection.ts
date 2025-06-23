import InlineInput from "@/components/Controls/InlineInput.vue";
import blockController from "@/utils/blockController";
import { computed } from "vue";

interface Category {
	name: string;
}

interface Brand {
	name: string;
}

const categoryData: Category[] = [];
const categoryOptions: string[] = [];

const brandData: Category[] = [];
const brandOptions: string[] = [];

fetch("/api/resource/Brand?fields=[\"name\"]")
	.then((response) => response.json())
	.then((data) => {
		brandData.push(...data.data.map((item) => ({
			name: item.name,
		})));
		brandOptions.push(...data.data.map((item) => item.name));
	});

fetch("/api/resource/Item%20Group?fields=[\"name\"]")
	.then((response) => response.json())
	.then((data) => {
		categoryData.push(...data.data.map((item) => ({
			name: item.name,
		})));
		categoryOptions.push(...data.data.map((item) => item.name));
	});

function slugify(text: string): string {
	return text
		.toString()
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "_")        // Replace spaces with underscores
		.replace(/[^\w]+/g, "_")     // Replace all non-word characters with underscores
		.replace(/^_+|_+$/g, "")     // Trim leading/trailing underscores
		.replace(/__+/g, "_");       // Replace multiple underscores with single
}

const dataKeySectionProperties = [
	{
		component: InlineInput,
		getProps: () => {
			return {
				label: "Category",
				type: "select",
				options: categoryOptions,
				modelValue: "",
			};
		},
		searchKeyWords: "Category, CategoryKey, Category Key",
		events: {
			"update:modelValue": (val: string) => {
				const slug = slugify(val);
				blockController.setDataKey("key", `category_wise_product_dict.${slug}`);
			},
		},
	},
	{
		component: InlineInput,
		getProps: () => {
			return {
				label: "Brand",
				type: "select",
				options: brandOptions,
				modelValue: "",
			};
		},
		searchKeyWords: "Brand, BrandKey, Brand Key",
		events: {
			"update:modelValue": (val: string) => {
				const slug = slugify(val);
				blockController.setDataKey("key", `brand_wise_product_dict.${slug}`);
			},
		},
	},
	{
		component: InlineInput,
		getProps: () => {
			return {
				label: "Key",
				modelValue: blockController.getDataKey("key"),
			};
		},
		searchKeyWords: "Key, DataKey, Data Key",
		events: {
			"update:modelValue": (val: string) => blockController.setDataKey("key", val),
		},
	},
	{
		component: InlineInput,
		condition: () => !blockController.isRepeater(),
		getProps: () => {
			return {
				label: "Type",
				modelValue: blockController.getDataKey("type"),
			};
		},
		searchKeyWords: "Type, DataType, Data Type",
		events: {
			"update:modelValue": (val: string) => blockController.setDataKey("type", val),
		},
	},
	{
		component: InlineInput,
		condition: () => !blockController.isRepeater(),
		getProps: () => {
			return {
				label: "Property",
				modelValue: blockController.getDataKey("property"),
			};
		},
		searchKeyWords: "Property, DataProperty, Data Property",
		events: {
			"update:modelValue": (val: string) => blockController.setDataKey("property", val),
		},
	},
];

export default {
	name: "Data Key",
	properties: dataKeySectionProperties,
	collapsed: computed(() => {
		return !blockController.getDataKey("key") && !blockController.isRepeater();
	}),
};
