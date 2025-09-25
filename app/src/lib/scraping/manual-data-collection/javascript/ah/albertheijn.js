;(function () {
  // --- CONFIGURE SELECTORS ---
  const containerSelector = ".search_list__C45Tu"
  const itemSelector = "a.store-details_store__MUQZs"
  const nameSelector = "p.typography_body-extra-strong__Syxy_"
  const addressSelector = "p.typography_body-regular__eSISX"
  const statusSelector = "p.stores-status-block_open__U4tNJ"
  const timeSelector = "p.stores-status-block_time__SB7JT"

  // --- SETUP DATA STRUCTURES ---
  const seenHrefs = new Set()
  const stores = []

  // --- FIND THE LIST CONTAINER ---
  const container = document.querySelector(containerSelector)
  if (!container) {
    lgg.error("❌ Container not found:", containerSelector)
    return
  }

  // --- EXTRACTION LOGIC ---
  function extractFromAnchor(a) {
    const href = a.href
    if (seenHrefs.has(href)) return false
    seenHrefs.add(href)

    const nameEl = a.querySelector(nameSelector)
    const addrEl = a.querySelector(addressSelector)
    const statusEl = a.querySelector(statusSelector)
    const timesEls = a.querySelectorAll(timeSelector)

    stores.push({
      name: nameEl ? nameEl.textContent.trim() : null,
      address: addrEl ? addrEl.textContent.trim() : null,
      status: statusEl ? statusEl.textContent.trim() : null,
      close: timesEls[1] ? timesEls[1].textContent.trim() : null,
      href,
    })
    return true
  }

  // --- INITIAL SNAPSHOT (in case there are already items) ---
  document.querySelectorAll(itemSelector).forEach(extractFromAnchor)

  // --- MUTATION OBSERVER SETUP ---
  let finishTimer
  function scheduleFinish() {
    clearTimeout(finishTimer)
    finishTimer = setTimeout(finish, 15000)
  }

  function finish() {
    observer.disconnect()
    lgg.info("🏁 No new stores for 15 s — here's your JSON:")
    lgg.info(JSON.stringify(stores, null, 2))
  }

  const observer = new MutationObserver((mutations) => {
    let addedAny = false
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue
        // check the node itself
        if (node.matches(itemSelector)) {
          if (extractFromAnchor(node)) addedAny = true
        }
        // check descendants
        if (node.querySelectorAll) {
          node.querySelectorAll(itemSelector).forEach((a) => {
            if (extractFromAnchor(a)) addedAny = true
          })
        }
      }
    }
    if (addedAny) scheduleFinish()
  })

  observer.observe(container, { childList: true, subtree: true })
  scheduleFinish()

  lgg.info('▶️ Observer started. Click "Next" as needed; after 15 s of no new items it will log the JSON.')
})()
