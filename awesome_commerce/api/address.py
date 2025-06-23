import frappe
from builder_ecommerce.cart import get_party, get_address_docs


@frappe.whitelist()
def get_shipping_addresses(party=None):
    """
    Retrieve the list of shipping addresses for the given party.

    Args:
        party (Optional[frappe.model.document.Document]): The party for whom the shipping addresses are fetched. Defaults to the current user's party.

    Returns:
        list: A list of dictionaries containing the name, title, and display of each shipping address.
    """
    if not party:
        party = get_party()
    addresses = get_address_docs(party=party)
    return [
        {
            "name": address.name,
            "title": address.address_title,
            "display": address.display,
            'address_line1': address.address_line1,
            'address_line2': address.address_line2,
            'city': address.city,
            'country': address.country,
            'pincode': address.pincode,
            'phone': address.phone,
            'email_id': address.email_id,
        }
        for address in addresses
        if address.address_type == "Shipping"
    ]


@frappe.whitelist()
def get_billing_addresses(party=None):
    """
    Retrieve the list of billing addresses for the given party.

    Args:
        party (Optional[frappe.model.document.Document]): The party for whom the billing addresses are fetched. Defaults to the current user's party.

    Returns:
        list: A list of dictionaries containing the name, title, and display of each billing address.
    """
    if not party:
        party = get_party()
    addresses = get_address_docs(party=party)
    return [
        {
            "name": address.name,
            "title": address.address_title,
            "display": address.display,
            'address_line1': address.address_line1,
            'city': address.city,
            'country': address.country,
            'pincode': address.pincode,
            'phone': address.phone,
            'email_id': address.email_id,
        }
        for address in addresses
        if address.address_type == "Billing"
    ]

