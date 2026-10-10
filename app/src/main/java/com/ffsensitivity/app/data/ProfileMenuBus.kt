package com.ffsensitivity.app.data

/**
 * Profile screen asks the activity to sign out or finish a deleted session
 * without growing MainActivity.
 */
object ProfileMenuBus {
    var requestSignOut: (() -> Unit)? = null
    var onAccountDeleted: (() -> Unit)? = null
}
