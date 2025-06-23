import re
import frappe

def snake_case_slug(text):
    text = re.sub(r"[^\w]+", "_", text)
    return text.lower().strip("_")

class ProductQuery:
    def __init__(self, page=1, limit=50000, filters=None, order_by="i.creation ASC"):
        offset = (page - 1) * limit
        self.start = offset
        self.page_length = limit
        self.page = page
        self.filters = filters
        self.order_by = order_by

    def validate_page(self):
        try:
            self.page = int(self.page)
            limit = int(self.page_length)
        except ValueError:
            return {"error": "Invalid page or limit value"}

        if self.page < 1 or limit < 1:
            return {"error": "Page and limit must be greater than 0"}

    def get_filters(self):
        conditions = []
        values = []

        if not self.filters:
            return "1=1", values

        for field, condition in self.filters.items():
            if isinstance(condition, list) and condition[0].lower() in ["in", "not in"]:
                operator = condition[0].upper()
                placeholders = ", ".join(["%s"] * len(condition[1]))
                conditions.append(f"{field} {operator} ({placeholders})")
                values.extend(condition[1])
            elif isinstance(condition, list) and len(condition) == 2:
                operator = condition[0]
                conditions.append(f"{field} {operator} %s")
                values.append(condition[1])
            else:
                conditions.append(f"{field} = %s")
                values.append(condition)

        where_clause = " AND ".join(conditions) if conditions else "1=1"
        return where_clause, values

    def get_query(self):
        where_clause, values = self.get_filters()
        query = f"""
            SELECT
                i.name,
                i.item_name,
                i.item_code,
                i.item_group,
                i.custom_route,
                i.brand,
                i.image,
                i.custom_oem_part_no,
                i.description,
                ip.price_list_rate AS item_price
            FROM `tabItem` i
            LEFT JOIN `tabItem Price` ip ON i.item_code = ip.item_code AND ip.selling = 1
            WHERE {where_clause}
            ORDER BY {self.order_by}
            LIMIT %s OFFSET %s
        """

        values.extend([self.page_length, self.start])
        return query, values

    def get_products(self, as_dict=False):
        query, values = self.get_query()
        products = frappe.db.sql(query, values, as_dict=as_dict)
        default_currency = frappe.defaults.get_global_default("currency")

        for product in products:
            currency = product.get("item_currency", default_currency)
            product["standard_rate"] = frappe.utils.fmt_money(product["item_price"], currency=currency)
            if not product.get("image"):
                product['image'] = '/assets/awesome_commerce/img/no-image-250x250.png'

        return products


@frappe.whitelist(allow_guest=True)
def get_products_data():
    query = ProductQuery()
    products = query.get_products(as_dict=True)

    category_wise_product_dict = {}
    category_slug_label_map = {}

    brand_wise_product_dict = {}
    brand_slug_label_map = {}

    for product in products:
        category_name = frappe.db.get_value("Item Group", product.item_group, "item_group_name")
        category_slug = snake_case_slug(category_name) if category_name else "unknown_category"

        category_slug_label_map[category_slug] = category_name or "Unknown Category"

        if category_slug not in category_wise_product_dict:
            category_wise_product_dict[category_slug] = []
        if len(category_wise_product_dict[category_slug]) < 10:
            category_wise_product_dict[category_slug].append(product)

        brand_name = product.get("brand") or "Unknown Brand"
        brand_slug = snake_case_slug(brand_name)

        brand_slug_label_map[brand_slug] = brand_name

        if brand_slug not in brand_wise_product_dict:
            brand_wise_product_dict[brand_slug] = []
        if len(brand_wise_product_dict[brand_slug]) < 10:
            brand_wise_product_dict[brand_slug].append(product)

    products_data = {
        "products": products,
        "category_wise_product_dict": category_wise_product_dict,
        "brand_wise_product_dict": brand_wise_product_dict,
    }
    return products_data


@frappe.whitelist(allow_guest=True)
def get_products():
    query = ProductQuery()
    products = query.get_products(as_dict=True)
    return products


@frappe.whitelist(allow_guest=True)
def get_product():
    category_route = frappe.form_dict.get('category_route')
    item_route = frappe.form_dict.get('item_route')

    route = '/shop/' + category_route + '/' + item_route
    filters = {
        "custom_publish_to_website": 1,
        "custom_route": route,
    }
    query = ProductQuery(filters=filters, limit=1)
    products = query.get_products(as_dict=True)
    if len(products) > 0:
        return products[0]
    else:
        return None


@frappe.whitelist(allow_guest=True)
def get_similar_products(category):
    filters = {
        "custom_publish_to_website": 1,
        "item_group": category.get('name') if category else "",
    }
    query = ProductQuery(filters=filters, limit=5)
    products = query.get_products(as_dict=True)
    return products


@frappe.whitelist()
def enqueue_update_products_route():
    frappe.enqueue("awesome_commerce.api.item.update_products_route", queue='long', timeout=300)
    return "Queued background job to update product routes."


def update_products_route():
    items = frappe.get_all("Item", fields=["name", "item_group", "item_name"])
    existing_routes = set(x[0] for x in frappe.db.get_all("Item", fields=["custom_route"], as_list=True))

    for item in items:
        if not item.item_group or not item.item_name:
            continue

        group_route = frappe.db.get_value("Item Group", item.item_group, "custom_route")
        if not group_route:
            group_route = f"/shop/{clean_slug(item.item_group)}"

        name = item.item_name.replace("/", " ") if item.item_name else ""

        name_slug = clean_slug(name)
        base_route = f"{group_route}/{name_slug}"
        route = base_route

        suffix = 1
        while route in existing_routes:
            suffix += 1
            route = f"{base_route}-{suffix}"
        existing_routes.add(route)

        frappe.db.set_value("Item", item.name, "custom_route", route)

    frappe.db.commit()
    return "success"


def clean_slug(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    text = text.strip('-')
    return text
