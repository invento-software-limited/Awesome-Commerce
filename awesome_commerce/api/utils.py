import frappe

@frappe.whitelist()
def has_permission(doctype, docname=None, perm_type="read"):
    """Returns a JSON with data whether the document has the requested permission"""
    if docname:
        has_perm = frappe.has_permission(doctype, perm_type.lower(), docname=docname)
    else:
        has_perm = frappe.has_permission(doctype, perm_type.lower())

    return {"has_permission": has_perm}
