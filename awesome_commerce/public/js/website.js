document.addEventListener("DOMContentLoaded", function () {
  const CSRF_TOKEN = frappe.csrf_token
  const HEADERS = {
    "Content-Type": "application/json",
    "x-frappe-csrf-token": CSRF_TOKEN,
    "x-requested-with": "XMLHttpRequest",
    Accept: "application/json, text/javascript, */*; q=0.01"
  }

  get_cart_count()
  if (window.location.pathname === "/cart" || window.location.pathname === "/checkout") {
    const placeOrderBtn = document.getElementById("place-order")
    if (placeOrderBtn) {
      placeOrderBtn.addEventListener("submit", async function (event) {
        event.preventDefault();

        let formData = new FormData(this);
        let jsonData = {};

        formData.forEach((value, key) => {
          jsonData[key] = value;
        });
        let payload = {doc: jsonData, cart_items: frappe.get_cookie("cart_items")};
        let response = await fetch("/api/method/awesome_commerce.api.cart.place_order", {
          method: "POST", headers: HEADERS, body: JSON.stringify(payload)
        });

        let result = await response.json();
        if (result.message) {
          Toastify({
            text: "Order placed successfully!",
            close: true,
            gravity: "top",
            position: "center",
            stopOnFocus: true,
            style: {
              background: "linear-gradient(to right, #00b09b, #96c93d)",
            }
          }).showToast();
          get_cart_count()
          let placeOrderDiv = document.getElementById('place-order');
          let successOrderDiv = document.getElementById('order_sucess');
          let orderIdElement = document.getElementById('order_id');
          let itemContainer = document.getElementById('item_container');

          if (placeOrderDiv) placeOrderDiv.style.display = 'none';
          if (successOrderDiv) successOrderDiv.style.display = 'flex';

          if (orderIdElement && result.message.name) {
            orderIdElement.innerHTML = result.message.name;
          }

          if (itemContainer && result.message.items && result.message.items.length > 0) {
            const originalTemplate = itemContainer.querySelector("div");
            const originalHTML = originalTemplate.cloneNode(true);

            itemContainer.innerHTML = "";

            result.message.items.forEach(item => {
              let itemNode = originalHTML.cloneNode(true);

              const imageElement = itemNode.querySelector(".item_image");
              if (imageElement) {
                imageElement.src = item.image || "/assets/awesome_commerce/img/no-image-250x250.png";
              }

              const nameElement = itemNode.querySelector(".item_name");
              if (nameElement) {
                nameElement.innerText = item.item_name;
              }

              const priceElement = itemNode.querySelector(".item_price");
              if (priceElement) {
                priceElement.innerText = item.amount;
              }

              itemContainer.appendChild(itemNode);
            });
          }
          // window.location.href = "/profile"
        } else {
          let message_obj = JSON.parse(result._server_messages)
          let message = JSON.parse(message_obj)
          Toastify({
            text: `${message.message}`,
            close: true,
            gravity: "top",
            position: "center",
            stopOnFocus: true,
            style: {
              background: "linear-gradient(to right, #00b09b, #96c93d)",
            }
          }).showToast();
        }
      });
    }
    get_cart_items();
  }

  const searchInput = document.getElementById("search-input");
  const productSearch = document.getElementById("product_search");

  if (productSearch) {
    productSearch.style.display = "none";
    let originalContent = productSearch.innerHTML;
    productSearch.innerHTML = "";

    function positionProductSearch() {
      const rect = searchInput.getBoundingClientRect();
      productSearch.style.position = "absolute";
      productSearch.style.top = `${rect.bottom + window.scrollY}px`;
      productSearch.style.left = `${rect.left + window.scrollX}px`;
      productSearch.style.width = `${rect.width}px`;
      productSearch.style.zIndex = "1000";
      productSearch.style.display = "block";
    }

    function debounce(func, delay) {
      let timeout;
      return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
      };
    }

    function doSearch() {
      const searchTerm = searchInput.value.trim().toLowerCase();

      if (searchTerm === "") {
        productSearch.innerHTML = "";
        productSearch.style.display = "none";
        return;
      }

      const filteredProducts = page_data.products.filter(product => {
        const search = searchTerm.toLowerCase();
        return (
          product.item_name?.toLowerCase().includes(search) ||
          product.item_code?.toLowerCase().includes(search) ||
          product.custom_oem_part_no?.toLowerCase().includes(search) ||
          product.description?.toLowerCase().includes(search)
        );
      });

      const fragment = document.createDocumentFragment();

      filteredProducts.forEach(product => {
        const tempContainer = document.createElement("div");
        tempContainer.innerHTML = originalContent;

        const itemElement = tempContainer.querySelector(".item");
        if (itemElement) itemElement.setAttribute("href", product.custom_route);

        const nameElement = tempContainer.querySelector(".product_name p");
        if (nameElement) nameElement.textContent = product.item_name;

        const imageElement = tempContainer.querySelector(".product_image");
        if (imageElement) imageElement.setAttribute("src", product.image);

        const priceElement = tempContainer.querySelector(".product_price p");
        if (priceElement) priceElement.textContent = `Price : ${product.standard_rate}`;

        fragment.appendChild(tempContainer);
      });

      productSearch.innerHTML = "";
      productSearch.appendChild(fragment);
      positionProductSearch();
    }

    const handleSearch = debounce(doSearch, 1000);
    searchInput.addEventListener("input", handleSearch);
  }


  function showVariantSelectionModal(attributes, itemCode) {
    let modalBody = document.getElementById("variantModalBody");
    modalBody.innerHTML = "";

    attributes.forEach(attr => {
      let selectDiv = document.createElement("div");
      selectDiv.classList.add("select-container");

      let label = document.createElement("label");
      label.textContent = attr.attribute;

      let select = document.createElement("select");
      select.setAttribute("name", attr.attribute);

      attr.values.forEach(value => {
        let option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });

      selectDiv.appendChild(label);
      selectDiv.appendChild(select);
      modalBody.appendChild(selectDiv);
    });

    let modal = document.getElementById("variantModal");
    modal.style.display = "flex";

    document.getElementById("closeModal").onclick = function () {
      modal.style.display = "none";
    }

    document.getElementById("confirmVariantSelection").onclick = function () {
      let selectedAttributes = {};
      document.querySelectorAll("#variantModalBody select").forEach(select => {
        selectedAttributes[select.name] = select.value;
      });
      fetch('/api/method/awesome_commerce.awesome_commerce.variant_selector.utils.get_next_attribute_and_values', {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({item_code: itemCode, selected_attributes: selectedAttributes}),
      }).then(response => response.json())
        .then(data => {
          addToCart(data.message, 1)
        })
      modal.style.display = "none";
    };
  }

  function addToCart(itemCode, qty) {
    fetch("/api/method/awesome_commerce.api.cart.update_cart", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({item_code: itemCode, qty: qty, cart_items: frappe.get_cookie("cart_items")}),
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(errData => {
            throw {status: response.status, message: errData.message || "Something went wrong"};
          });
        }
        return response.json();
      })
      .then(data => {
        get_cart_count()
        Toastify({
          text: "Item added to cart!",
          close: true,
          destination: "/cart",
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            background: "linear-gradient(to right, #00b09b, #96c93d)",
          }
        }).showToast();
      })
  }

  document.querySelectorAll(".btn-order-cancel").forEach(button => {
    button.addEventListener("click", function () {
      let name = this.getAttribute("data-name");
      if (!name) return;
      fetch('/api/method/awesome_commerce.awesome_commerce.order.order.cancel_order', {
        method: "POST", headers: HEADERS, body: JSON.stringify({order_id: name})
      })
        .then(response => response.json())
        .then(data => {
          if (data.message) {
            Toastify({
              text: data.message.message,
              close: true,
              destination: "/cart",
              gravity: "top",
              position: "center",
              stopOnFocus: true,
              style: {
                background: "linear-gradient(to right, #00b09b, #96c93d)",
              }
            }).showToast();
          } else {
            Toastify({
              text: "No message returned from the server.",
              close: true,
              destination: "/cart",
              gravity: "top",
              position: "center",
              stopOnFocus: true,
              style: {
                background: "linear-gradient(to right, #00b09b, #96c93d)",
              }
            }).showToast();
          }
        })
        .catch(error => console.error("Error fetching attributes:", error));

    });
  });

  const dropdownButtons = document.querySelectorAll(".dropdown-btn");

  if (dropdownButtons.length > 0) {
    dropdownButtons.forEach((btn) => {
      const dropdownList = btn.nextElementSibling;

      // Check if dropdownList exists
      if (!dropdownList) return;

      // Show dropdown on hover
      btn.addEventListener("mouseover", function () {
        positionDropdown(this, dropdownList);
        dropdownList.style.display = "flex";
      });

      // Hide dropdown when mouse leaves the button
      btn.addEventListener("mouseleave", function (event) {
        if (!dropdownList.contains(event.relatedTarget)) {
          dropdownList.style.display = "none";
        }
      });

      // Keep dropdown visible while hovering over it
      dropdownList.addEventListener("mouseover", function () {
        dropdownList.style.display = "flex";
      });

      // Hide dropdown when mouse leaves the dropdown
      dropdownList.addEventListener("mouseleave", function () {
        dropdownList.style.display = "none";
      });
    });
  }

  function positionDropdown(button, dropdown) {
    const rect = button.getBoundingClientRect();
    dropdown.style.position = "absolute";
    dropdown.style.top = `${rect.bottom + window.scrollY}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    dropdown.style.width = "auto";
    dropdown.style.zIndex = "1000";
    dropdown.style.boxShadow = "0px 4px 8px rgba(0, 0, 0, 0.2)";
    dropdown.style.borderRadius = "0px";
    dropdown.style.padding = "20px";
    dropdown.style.display = "flex";
    dropdown.style.flexDirection = "column";
  }

  document.querySelectorAll(".btn-reorder").forEach(button => {
    button.addEventListener("click", function () {
      let name = this.getAttribute("data-name");
      if (!name) return;
      fetch('/api/method/awesome_commerce.awesome_commerce.order.order.reorder', {
        method: "POST", headers: HEADERS, body: JSON.stringify({order_id: name})
      })
        .then(response => response.json())
        .then(data => {
          if (data.message) {
            Toastify({
              text: data.message.message, close: true, gravity: "top", position: "center", stopOnFocus: true, style: {
                background: "linear-gradient(to right, #00b09b, #96c93d)",
              }
            }).showToast();
          } else {
            Toastify({
              text: "No message returned from the server.",
              close: true,
              gravity: "top",
              position: "center",
              stopOnFocus: true,
              style: {
                background: "linear-gradient(to right, #00b09b, #96c93d)",
              }
            }).showToast();
          }
        })
        .catch(error => console.error("Error fetching attributes:", error));

    });
  });
  document.querySelectorAll(".add-to-cart").forEach(button => {
    button.addEventListener("click", function () {
      let itemCode = this.getAttribute("data-item_code");
      if (!itemCode) return;

      // Find the product in page_data.products
      let product = page_data.products.find(product => product.item_code === itemCode);

      if (product) {
        if (product.has_variants === 1) {
          // Fetch attributes from API
          fetch(`/api/method/awesome_commerce.awesome_commerce.variant_selector.utils.get_attributes_and_values?item_code=${itemCode}`, {
            method: "GET", headers: HEADERS,
          })
            .then(response => response.json())
            .then(data => {
              if (data.message && data.message.length > 0) {
                showVariantSelectionModal(data.message, itemCode);
              }
            })
            .catch(error => console.error("Error fetching attributes:", error));
        } else {
          addToCart(itemCode, 1)
        }
      } else {
        console.log("Product not found.");
      }

    });
  });

  function get_cart_count() {
    const cartCount = frappe.get_cookie("cart_count") || 0;
    const cartTotal = frappe.get_cookie("cart_total") || '€ 0.00';
    const cartCountContainer = document.getElementById("cart_count");
    const cartTotalContainer = document.getElementById("cart_total");
    if (cartCountContainer) {
      cartCountContainer.innerText = cartCount;
    }
    if (cartTotalContainer) {
      cartTotalContainer.innerText = cartTotal;
    }
  }

  function get_cart_items() {
    const cartItems = frappe.get_cookie("cart_items") || "[]";

    fetch(`/api/method/awesome_commerce.api.cart.get_cart_items?cart_items=${cartItems}`, {
      method: "GET", headers: HEADERS
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(errData => {
            throw {status: response.status, message: errData.message || "Something went wrong"};
          });
        }
        return response.json();
      })
      .then(data => {
        const cartItems = data.message;
        let cartContainer = document.querySelector('#cart-container');
        let originalContent = cartContainer.innerHTML;
        cartContainer.innerHTML = '';

        if (cartItems.length === 0) {
          let placeOrderElement = document.getElementById("place-order");
          let cartElement = document.getElementById("cart-section");
          let emptyElement = document.getElementById("empty-cart");
          if (cartElement && emptyElement) {
            cartElement.style.display = "none";
            emptyElement.style.display = 'flex';
          }

          if (placeOrderElement) {
            placeOrderElement.style.display = 'none';
          }
        } else {
          cartItems.forEach(item => {
            let tempContainer = document.createElement('div');
            tempContainer.classList.add('cart-item');
            tempContainer.setAttribute('data-item-code', item.item_code);
            tempContainer.innerHTML = originalContent;

            let nameElement = tempContainer.querySelector('.item_name');
            if (nameElement) {
              nameElement.textContent = item.item_name;
            }
            let qtyElement = tempContainer.querySelector('.item_qty p');
            if (qtyElement) {
              qtyElement.textContent = item.qty;
            }
            let imageElement = tempContainer.querySelector('.item_image');
            if (imageElement) {
              imageElement.setAttribute('src', item.image);
            }
            let codeElement = tempContainer.querySelector('.item_code');
            if (codeElement) {
              codeElement.textContent = item.item_code;
            }
            let priceElement = tempContainer.querySelector('.price');
            if (priceElement) {
              priceElement.textContent = item.rate;
            }

            let amountElement = tempContainer.querySelector('.amount');
            if (amountElement) {
              amountElement.textContent = item.amount;
            }

            let rateElement = tempContainer.querySelector('.rate p');
            if (rateElement) {
              rateElement.textContent = item.rate;
            }

            let updateElements = tempContainer.querySelectorAll('.update_cart_qty');
            updateElements.forEach(updateElement => {
              updateElement.dataset.itemCode = item.item_code;
              updateElement.onclick = function () {
                let itemCode = this.dataset.itemCode;
                let action = this.dataset.action;
                let product = page_data.products.find(p => p.item_code === itemCode);
                let changeQty = parseInt(this.dataset.qty) || 1;
                let newQty = parseInt(qtyElement.textContent) || 1;
                let itemContainer = tempContainer.closest(".cart-item");

                if (action === "add") {
                  newQty += changeQty;
                } else if (action === "remove") {
                  newQty -= changeQty;
                }

                update_cart_qty(itemCode, changeQty, action);
                get_cart_count();

                if (newQty < 1 || action === 'delete') {
                  if (itemContainer) {
                    itemContainer.remove();
                  }
                } else {
                  qtyElement.textContent = newQty;
                }
                let amountElement = tempContainer.querySelector('.amount');
                if (amountElement) {
                  let standardRate = 0;
                  if (product && product.standard_rate) {
                    standardRate = parseFloat(product.standard_rate.replace(/[^0-9.]/g, '')) || 0;
                  }
                  let amount = (standardRate * newQty).toFixed(2);
                  amountElement.textContent = `${amount}`;
                }
              };
            });

            cartContainer.appendChild(tempContainer);
          });
        }
      })
      .catch(error => {
        Toastify({
          text: `Error adding item: ${(error.message || "Unknown error")}`,
          close: true,
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            background: "linear-gradient(to right, #00b09b, #96c93d)",
          }
        }).showToast();
      });

    get_order_details(cartItems)
  }

  function get_order_details(cartItems) {
    fetch(`/api/method/awesome_commerce.api.cart.get_order_details?cart_items=${cartItems}`, {
      method: "GET", headers: HEADERS
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(errData => {
            throw {status: response.status, message: errData.message || "Something went wrong"};
          });
        }
        return response.json();
      })
      .then(data => {
        const orderDetails = data.message;
        if (orderDetails) {
          let subTotalItem = document.getElementById('sub_total');
          if (subTotalItem) {
            subTotalItem.innerHTML = orderDetails.total_price;
          }

          let grandTotalItem = document.getElementById('grand_total');
          if (grandTotalItem) {
            grandTotalItem.innerHTML = orderDetails.grand_total;
          }

          const taxContainerParent = document.getElementById('tax_container');
          if (taxContainerParent) {
            // Use the hidden template to get the original design
            const originalTaxTemplate = document.getElementById('tax_template');

            if (originalTaxTemplate) {
              // Reset taxContainerParent with the original template
              taxContainerParent.innerHTML = originalTaxTemplate.innerHTML;

              // Loop through order summary and populate the new content
              orderDetails.order_summary.forEach(summary => {
                let tempTaxContainer = document.createElement('div');
                tempTaxContainer.innerHTML = originalTaxTemplate.innerHTML;

                let nameElement = tempTaxContainer.querySelector('.tax_name');
                if (nameElement) {
                  let description = '';
                  if (summary.included_in_price === 1) {
                    description = `${summary.description} (Inc)`;
                  } else {
                    description = summary.description;
                  }
                  nameElement.textContent = description;
                }

                let amountElement = tempTaxContainer.querySelector('.tax_amount');
                if (amountElement) {
                  amountElement.textContent = summary.tax_amount;
                }

                taxContainerParent.appendChild(tempTaxContainer);
              });
            }
          }
        }
      })
      .catch(error => {
        console.error("Error fetching order details:", error);
      });
  }


  let isCartUpdateInProgress = false;

  function update_cart_qty(item_code, qty, action) {
    if (isCartUpdateInProgress) return; // Prevent multiple simultaneous calls
    isCartUpdateInProgress = true;

    fetch('/api/method/awesome_commerce.api.cart.update_cart_qty', {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        item_code: item_code,
        qty: qty,
        action: action,
        cart_items: frappe.get_cookie("cart_items") || "[]"
      })
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(errData => {
            throw {status: response.status, message: errData.message || "Something went wrong"};
          });
        }
        return response.json();
      })
      .then(data => {
        let item = data.message;
        if (typeof item === 'string') {
          try {
            item = JSON.parse(item);
          } catch (e) {
            console.error('Error parsing cartItems:', e);
            item = [];
          }
        }

        Toastify({
          text: "Cart Updated!",
          close: true,
          destination: "/cart",
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            background: "linear-gradient(to right, #00b09b, #96c93d)",
          }
        }).showToast();

        const cartItems = frappe.get_cookie("cart_items") || "[]";
        get_order_details(cartItems);

        const cartElement = document.getElementById("cart-section");
        const emptyElement = document.getElementById("empty-cart");

        if (item.length === 0 && cartElement && emptyElement) {
          cartElement.style.display = "none";
          emptyElement.style.display = 'flex';
        }

        get_cart_count();
      })
      .catch(error => {
        Toastify({
          text: `❌ Error updating cart: ${error.message || "Unknown error"}`,
          close: true,
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            background: "linear-gradient(to right, #ff5f6d, #ffc371)",
          }
        }).showToast();
      })
      .finally(() => {
        isCartUpdateInProgress = false; // Release lock after request
      });
  }


  const newsletterForm = document.getElementById("newsletter_subscribe");

  if (newsletterForm) {
    newsletterForm.addEventListener("submit", async function (event) {
      event.preventDefault(); // Prevent default form submission

      const formData = new FormData(this);
      const formObject = Object.fromEntries(formData.entries()); // Convert FormData to a plain object

      try {
        const response = await fetch("/api/method/frappe.email.doctype.newsletter.newsletter.subscribe", {
          method: "POST",
          headers: HEADERS,
          body: JSON.stringify(formObject)
        });

        const data = await response.json();

        if (data.message) {
          Toastify({
            text: "Subscribed successfully!",
            close: true,
            gravity: "top",
            position: "center",
            stopOnFocus: true,
            style: {
              background: "linear-gradient(to right, #00b09b, #96c93d)",
            }
          }).showToast();
        } else {
          throw new Error(data.exc || "Subscription failed! Please try again.");
        }
      } catch (error) {
        console.error("Error:", error);

        let errorMessage = "An error occurred. Please try again.";

        // Try to extract error message from the response
        if (error.response) {
          try {
            const errorData = await error.response.json();
            if (errorData._server_messages) {
              const serverMessages = JSON.parse(errorData._server_messages);
              errorMessage = serverMessages.map(msg => JSON.parse(msg).message).join(" ");
            }
          } catch (parseError) {
            console.error("Error parsing response:", parseError);
          }
        }

        Toastify({
          text: errorMessage,
          close: true,
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            background: "linear-gradient(to right, #ff416c, #ff4b2b)",
          }
        }).showToast();
      }
    });
  }

  document.querySelectorAll('.collapse-btn').forEach(button => {
    button.addEventListener('click', function () {
      const categoryId = this.getAttribute('data-category_id');
      const targetDiv = this.parentElement.parentElement.parentElement.querySelector(`[data-name="${categoryId}"]`);
      const extendButton = this.parentElement.querySelector('.extend-btn');

      if (targetDiv) {
        targetDiv.style.display = 'none';

        if (extendButton) {
          extendButton.style.display = 'flex';
          this.style.display = 'none'
        }
      }
    });
  });
  document.querySelectorAll('.extend-btn').forEach(button => {
    button.addEventListener('click', function () {
      const categoryId = this.getAttribute('data-category_id');
      const targetDiv = this.parentElement.parentElement.parentElement.querySelector(`[data-name="${categoryId}"]`);
      const collapseButton = this.parentElement.querySelector('.collapse-btn');

      if (targetDiv) {
        targetDiv.style.display = 'flex';
        if (collapseButton) {
          collapseButton.style.display = 'flex';
          this.style.display = 'none';
        }
      }
    });
  });

  const addressCreateBtn = document.getElementById("address_create_btn");

  if (addressCreateBtn) {
    addressCreateBtn.addEventListener("click", () => {
      const createForm = document.getElementById("address_create_form");

      if (createForm) {
        const formData = new FormData(createForm);

        const data = {
          name: formData.get('name'),
          address_line1: formData.get('address_line1'),
          address_line2: formData.get('address_line2'),
          city: formData.get('city'),
          country: formData.get('country'),
          pincode: formData.get('pincode'),
          phone: formData.get('phone'),
          state: formData.get('state'),
          address_title: `${frappe.get_cookie('full_name')}-Address`,
          doctype: "Address",
          address_type: formData.get('address_type'),
          web_form_name: 'addresses'
        };

        addressCreateUpdate(data);
      }
    });
  }


  document.querySelectorAll('.address_edit').forEach(button => {
    button.addEventListener('click', (e) => {
      document.getElementById('tab-3').style.display = 'none';
      const form = document.getElementById('address_create_form');
      form.style.display = 'block';
      const addressContainer = button.closest('section');

      const address_line1 = addressContainer.querySelector('.address_line1')?.textContent.trim();
      const address_line2 = addressContainer.querySelector('.address_line2')?.textContent.trim();
      const city = addressContainer.querySelector('.city')?.textContent.trim();
      const state = addressContainer.querySelector('.state')?.textContent.trim();
      const country = addressContainer.querySelector('.country')?.textContent.trim();
      const pincode = addressContainer.querySelector('.pincode')?.textContent.trim();
      const phone = addressContainer.querySelector('.phone')?.textContent.trim();

      form.querySelector('textarea[name="address_line1"]').value = address_line1 || '';
      form.querySelector('textarea[name="address_line2"]').value = address_line2 || '';
      form.querySelector('input[name="city"]').value = city || '';
      form.querySelector('input[name="state"]').value = state || '';
      form.querySelector('select[name="country"]').value = country || '';
      form.querySelector('input[name="pincode"]').value = pincode || '';
      form.querySelector('input[name="phone"]').value = phone || '';


      const dataName = button.getAttribute('data-name');
      form.querySelector('select[name="address_type"]').value = dataName.includes('Shipping') ? 'Shipping' : 'Billing';
      let hiddenInput = form.querySelector('input[name="name"]');
      if (!hiddenInput) {
        hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = 'name';
        form.appendChild(hiddenInput);
      }
      hiddenInput.value = dataName;
    });
  });


  const addNewAddressBtn = document.getElementById("addNewAddressBtn");
  const addressCreateCancel = document.getElementById("address_create_cancel");
  const addressCreateForm = document.getElementById("address_create_form");
  const tab3 = document.getElementById("tab-3");

  if (addNewAddressBtn) {
    addNewAddressBtn.addEventListener("click", () => {
      if (tab3) {
        tab3.style.display = 'none';
      }
      if (addressCreateForm) {
        addressCreateForm.style.display = 'flex';
      }
    });
  }

  if (addressCreateCancel) {
    addressCreateCancel.addEventListener("click", () => {
      if (addressCreateForm) {
        addressCreateForm.style.display = 'none';
      }
      if (tab3) {
        tab3.style.display = 'block';
      }
    });
  }


  document.querySelectorAll('.delete-address').forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();

      const dataName = button.getAttribute('data-name');

      // Optional: Confirm before delete
      const confirmDelete = confirm(`Are you sure you want to delete address: ${dataName}?`);
      if (!confirmDelete) return;

      try {
        const response = await fetch('/api/method/awesome_commerce.api.address.delete_address', {
          method: 'DELETE',
          headers: HEADERS,
          body: JSON.stringify({name: dataName})
        });

        const result = await response.json();

        if (response.ok) {
          Toastify({
            text: 'Address deleted successfully',
            close: true,
            gravity: "top",
            position: "center",
            stopOnFocus: true,
            style: {
              background: "linear-gradient(to right, #00b09b, #96c93d)",
            }
          }).showToast();

          const addressSection = button.closest('section');
          addressSection?.remove();
        } else {
          Toastify({
            text: `Failed to delete address: ${(result.message || 'Unknown error')}`,
            close: true,
            gravity: "top",
            position: "center",
            stopOnFocus: true,
            style: {
              background: "linear-gradient(to right, #00b09b, #96c93d)",
            }
          }).showToast();
        }

      } catch (err) {
        console.error('Delete error:', err);
        Toastify({
          text: 'An error occurred while deleting the address.',
          close: true,
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            background: "linear-gradient(to right, #00b09b, #96c93d)",
          }
        }).showToast();
      }
    });

  });


  function addressCreateUpdate(data) {
    const payload = {
      data: JSON.stringify(data),
      web_form: "addresses",
      for_payment: false,
      cmd: "frappe.website.doctype.web_form.web_form.accept"
    };

    const csrfToken = frappe.csrf_token || '';

    fetch('/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-frappe-cmd': 'frappe.website.doctype.web_form.web_form.accept',
        'x-frappe-csrf-token': csrfToken,
        'x-requested-with': 'XMLHttpRequest',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
      },
      body: JSON.stringify(payload)
    })
      .then(response => response.json())
      .then(() => {
        Toastify({
          text: 'Address Created successfully',
          close: true,
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            background: "linear-gradient(to right, #00b09b, #96c93d)",
          }
        }).showToast();
        setTimeout(() => {
          window.location.href = '/profile?showTab=3';
        }, 500);
      })
      .catch(error => {
        console.error('Error:', error);
      });
  }

  const limit = page_data.limit;
  const totalProducts = page_data.total_products;
  let currentPage = page_data.page;
  const totalPages = Math.ceil(totalProducts / limit);

  const previousBtn = document.getElementById('previous_button');
  const nextBtn = document.getElementById('next_button');

  if (previousBtn) {
    previousBtn.addEventListener('click', () => {
      console.log("Previous clicked");
      if (currentPage > 1) {
        currentPage--;
        goToPage(currentPage);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      console.log("Next clicked");
      if (currentPage < totalPages) {
        currentPage++;
        goToPage(currentPage);
      }
    });
  }

  function goToPage(page) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', page);
    window.location.href = url.toString(); // Triggers full reload
  }

  const qtyDisplay = document.querySelector('#qty_update p');
  const qtyMinus = document.getElementById('qty_minus');
  const qtyAdd = document.getElementById('qty_add');
  const addToBasket = document.getElementById('add_to_basket');

  if (qtyDisplay && qtyMinus && qtyAdd && addToBasket) {
    let quantity = parseInt(qtyDisplay.textContent);

    qtyMinus.addEventListener('click', function () {
      if (quantity > 1) {
        quantity--;
        qtyDisplay.textContent = quantity;
      }
    });

    qtyAdd.addEventListener('click', function () {
      quantity++;
      qtyDisplay.textContent = quantity;
    });

    addToBasket.addEventListener('click', function () {
      const itemCode = addToBasket.getAttribute('data-item_code');
      update_cart_qty(itemCode, quantity, 'add');
    });
  }
});

frappe.get_cookie = function getCookie(name) {
  return frappe.get_cookies()[name];
};

frappe.get_cookies = function getCookies() {
  var c = document.cookie, v = 0, cookies = {};
  if (document.cookie.match(/^\s*\$Version=(?:"1"|1);\s*(.*)/)) {
    c = RegExp.$1;
    v = 1;
  }
  if (v === 0) {
    c.split(/[,;]/).map(function (cookie) {
      var parts = cookie.split(/=/, 2), name = decodeURIComponent(parts[0].trimLeft()),
        value = parts.length > 1 ? decodeURIComponent(parts[1].trimRight()) : null;
      if (value && value.charAt(0) === '"') {
        value = value.substr(1, value.length - 2);
      }
      cookies[name] = value;
    });
  } else {
    c.match(/(?:^|\s+)([!#$%&'*+\-.0-9A-Z^`a-z|~]+)=([!#$%&'*+\-.0-9A-Z^`a-z|~]*|"(?:[\x20-\x7E\x80\xFF]|\\[\x00-\x7F])*")(?=\s*[,;]|$)/g).map(function ($0, $1) {
      var name = $0, value = $1.charAt(0) === '"' ? $1.substr(1, -1).replace(/\\(.)/g, "$1") : $1;
      cookies[name] = value;
    });
  }
  return cookies;
};
