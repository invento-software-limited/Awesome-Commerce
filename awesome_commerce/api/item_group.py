import frappe
from hopkins.api.item import ProductQuery, clean_slug


@frappe.whitelist(allow_guest=True)
def get_categories():
    categories = frappe.get_all(
        "Item Group",
        filters={
            "parent_item_group": ["in", ["", "All Item Groups"]],
            "custom_publish_to_website": 1,
            "name": ["!=", "All Item Groups"]
        },
        fields=["name", "item_group_name", "custom_route", "custom_description", "image"]
    )


    def get_subcategories(parent_name):
        subcategories = frappe.get_all(
            "Item Group",
            filters={"parent_item_group": parent_name, "custom_publish_to_website": 1},
            fields=["name", "item_group_name", "custom_route", "custom_description", "image"]
        )
        for subcategory in subcategories:
            subcategory["subcategories"] = get_subcategories(subcategory["name"])
            if not subcategory.get("image"):
                subcategory["image"] = '/assets/hopkins/img/no-image-250x250.png'
        return subcategories

    category_tree = []
    for category in categories:
        if not category.get("image"):
            category["image"] = '/assets/hopkins/img/no-image-250x250.png'
        category["subcategories"] = get_subcategories(category["name"])
        category_tree.append(category)

    return category_tree


@frappe.whitelist(allow_guest=True)
def search_category(categories, category_route):
    """Recursively searches for a category by its custom_route."""
    if categories and category_route:
        if not category_route.startswith("/shop/"):
            category_route = "/shop/" + category_route

        for category in categories:
            if category.get("custom_route") == category_route:
                if not category.get("image"):
                    category["image"] = '/assets/hopkins/img/no-image-250x250.png'
                return category

            if "subcategories" in category and category["subcategories"]:
                found = search_category(category["subcategories"], category_route)
                if found:
                    return found
    return None


@frappe.whitelist(allow_guest=True)
def get_products(category_name=None, page=1, limit=12, sort_by="Default"):
    """Returns paginated products for a given category name and its descendants."""

    if isinstance(page, str):
        page = int(page) if page.isdigit() else 1

    if isinstance(limit, str):
        limit = int(limit) if limit.isdigit() else 12

    # Map sort options to SQL ORDER BY clauses
    sort_map = {
        "Default": "i.creation ASC",
        "Price Low To High": "ip.price_list_rate ASC",
        "Price High To Low": "ip.price_list_rate DESC",
        "Alphabetical (A to Z)": "i.item_name ASC",
        "Alphabetical (Z to A)": "i.item_name DESC"
    }
    order_by = sort_map.get(sort_by, "i.creation ASC")

    filters = {"custom_publish_to_website": 1}
    descendant_categories = []

    def get_descendant_categories(parent_name):
        """Recursively fetches all descendant categories."""
        subcategories = frappe.get_all(
            "Item Group",
            filters={"parent_item_group": parent_name, "custom_publish_to_website": 1},
            fields=["name"]
        )
        descendants = [subcategory["name"] for subcategory in subcategories]
        for subcategory in subcategories:
            descendants.extend(get_descendant_categories(subcategory["name"]))
        return descendants

    category = None
    if category_name:
        category = frappe.get_cached_doc("Item Group", category_name)
        if category:
            descendant_categories = get_descendant_categories(category.name)
            descendant_categories.append(category.name)

            if descendant_categories:
                filters["item_group"] = ["in", descendant_categories]

    query = ProductQuery(page=page, limit=limit, filters=filters, order_by=order_by)
    products = query.get_products(as_dict=True)

    total_products = frappe.db.count("Item", filters=filters)

    category_data = {
        "name": category.name if category else None,
        "custom_route": getattr(category, "custom_route", None),
    } if category else None

    return {
        "category": category_data,
        "products": products,
        "page": page,
        "limit": limit,
        "total_products": total_products
    }


def update_item_group_routes():
    groups = frappe.get_all("Item Group", fields=["name", "item_group_name"])
    existing_routes = set(x[0] for x in frappe.db.get_all("Item Group", fields=["custom_route"], as_list=True))

    for group in groups:
        name = group.item_group_name.replace("/", " ") if group.item_group_name else ""
        name_slug = clean_slug(name)
        base_route = f"/shop/{name_slug}"
        route = base_route

        suffix = 1
        while route in existing_routes:
            suffix += 1
            route = f"{base_route}-{suffix}"
        existing_routes.add(route)

        frappe.db.set_value("Item Group", group.name, "custom_route", route)

    frappe.db.commit()

@frappe.whitelist()
def enqueue_update_item_group_routes():
    frappe.enqueue(
        "awesome_commerce.api.item_group.update_item_group_routes",
        queue='long',
        timeout=300
    )
    return "Queued background job to update item group routes."
