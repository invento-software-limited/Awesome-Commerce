import frappe
import os
import json

from awesome_commerce.utils import sync_block_templates, sync_page_templates


def after_install():
    create_ecommerce_project_folder()
    fixtures_path = frappe.get_app_path('awesome_commerce', 'initial_fixtures')

    print("Syncing Template")
    for file_name in os.listdir(fixtures_path):
        if file_name.endswith('.json'):
            with open(os.path.join(fixtures_path, file_name)) as f:
                data = json.load(f)
                for doc in data:
                    try:
                        frappe.get_doc(doc).insert(ignore_if_duplicate=True, ignore_permissions=True)
                    except frappe.DuplicateEntryError:
                        pass


    sync_page_templates()
    sync_block_templates()


def after_migrate():
    create_ecommerce_project_folder()
    sync_page_templates()
    sync_block_templates()


def create_ecommerce_project_folder():
    if not frappe.db.exists("Builder Project Folder", {"folder_name": "e-commerce"}):
        frappe.get_doc({
            "doctype": "Builder Project Folder",
            "folder_name": "e-commerce",
        }).insert(ignore_permissions=True)
