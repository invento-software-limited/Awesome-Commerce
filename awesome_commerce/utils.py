import frappe
from builder.utils import make_records


def sync_page_templates():
    print("Syncing Builder Components")
    builder_component_path = frappe.get_module_path("awesome_commerce", "builder_component")
    make_records(builder_component_path)

    print("Syncing Builder Scripts")
    builder_script_path = frappe.get_module_path("awesome_commerce", "builder_client_script")
    make_records(builder_script_path)


def sync_block_templates():
    print("Syncing Builder Block Templates")
    builder_block_template_path = frappe.get_module_path("awesome_commerce", "builder_block_template")
    make_records(builder_block_template_path)
