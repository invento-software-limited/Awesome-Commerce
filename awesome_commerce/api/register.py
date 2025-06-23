import frappe
from awesome_commerce.api.cart import create_user
from builder_ecommerce.cart import add_new_address, create_party, create_contact, update_address_with_customer


@frappe.whitelist(allow_guest=True)
def register(doc):
    doc = frappe.parse_json(doc)
    user = create_user(data=doc)
    first_name = doc.get("first_name", "")
    last_name = doc.get("last_name", "")
    address_title = f"{first_name} {last_name}".strip()
    doc["address_title"] = address_title
    address = add_new_address(frappe.as_json(doc))

    customer = {
        "customer_name": doc.first_name + " " + doc.last_name,
        "mobile_number": doc.telephone,
        "customer_email_address": doc.email
    }

    party = create_party(doc=customer)
    if party:
        create_contact(doc, party.name)
        if address:
            update_address_with_customer(address.name, party.name)

    if hasattr(frappe.local, "cookie_manager"):
        frappe.local.cookie_manager.delete_cookie("cart_count")
        frappe.local.cookie_manager.delete_cookie("cart_total")

    return user
