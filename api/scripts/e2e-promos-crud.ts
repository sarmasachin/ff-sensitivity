import { fail, pass, req } from './e2e-promos-lib';

export async function runPromoPersistChecks(
  token: string,
  window: { startsAt: string; endsAt: string },
) {
  const persistId = `e2e_promo_${Date.now()}`;
  const body = {
    id: persistId,
    title: 'E2E Persist',
    subtitle: 'item crud',
    imageLabel: 'e2e-persist',
    deepLink: 'ffops://challenge',
    placement: 'HOME_BANNER' as const,
    sortOrder: 99,
    enabled: true,
    startsAt: window.startsAt,
    endsAt: window.endsAt,
  };

  {
    const r = await req('POST', '/api/v1/admin/promos');
    r.status === 401
      ? pass('promo_create_requires_auth')
      : fail('promo_create_requires_auth', `HTTP ${r.status}`);
  }

  const created = await req('POST', '/api/v1/admin/promos', {
    token,
    body,
  });
  created.status < 300 && created.json?.id === persistId
    ? pass('admin_create_promo')
    : fail(
        'admin_create_promo',
        `HTTP ${created.status} ${JSON.stringify(created.json)?.slice(0, 180)}`,
      );

  const afterCreate = await req('GET', '/api/v1/admin/promos', { token });
  afterCreate.json?.promos?.some((p: { id?: string }) => p.id === persistId)
    ? pass('created_promo_present_on_get')
    : fail('created_promo_present_on_get');

  const liveAfterCreate = await req('GET', '/api/v1/promos/live');
  liveAfterCreate.json?.promos?.some((p: { id?: string }) => p.id === persistId)
    ? pass('created_promo_on_public_live')
    : fail('created_promo_on_public_live');

  const renamed = await req('PUT', `/api/v1/admin/promos/${persistId}`, {
    token,
    body: { ...body, title: 'E2E Persist Edited' },
  });
  const liveAfterEdit = await req('GET', '/api/v1/promos/live');
  const liveEdited = liveAfterEdit.json?.promos?.find(
    (p: { id?: string }) => p.id === persistId,
  );
  renamed.status < 300 && liveEdited?.title === 'E2E Persist Edited'
    ? pass('edited_promo_on_public_live')
    : fail(
        'edited_promo_on_public_live',
        `HTTP ${renamed.status} title=${liveEdited?.title}`,
      );

  const updated = await req('PUT', `/api/v1/admin/promos/${persistId}`, {
    token,
    body: { ...body, title: 'E2E Persist Edited', enabled: false },
  });
  const afterUpdate = await req('GET', '/api/v1/admin/promos', { token });
  const updatedRow = afterUpdate.json?.promos?.find(
    (p: { id?: string }) => p.id === persistId,
  );
  const liveAfterOff = await req('GET', '/api/v1/promos/live');
  updated.status < 300 &&
  updatedRow?.title === 'E2E Persist Edited' &&
  updatedRow?.enabled === false &&
  !liveAfterOff.json?.promos?.some((p: { id?: string }) => p.id === persistId)
    ? pass('admin_update_toggle_promo')
    : fail(
        'admin_update_toggle_promo',
        JSON.stringify(updatedRow)?.slice(0, 160),
      );

  const dup = await req('POST', '/api/v1/admin/promos', { token, body });
  dup.status === 409 && dup.json?.error?.code === 'PROMOS_DUP_ID'
    ? pass('duplicate_promo_id_rejected')
    : fail(
        'duplicate_promo_id_rejected',
        `HTTP ${dup.status} ${JSON.stringify(dup.json)?.slice(0, 160)}`,
      );

  const listed = await req('GET', '/api/v1/admin/promos', { token });
  const ids = (listed.json?.promos ?? []).map((p: { id: string }) => p.id);
  const reordered = [persistId, ...ids.filter((id: string) => id !== persistId)];
  const reorder = await req('PATCH', '/api/v1/admin/promos/reorder', {
    token,
    body: { ids: reordered },
  });
  const afterReorder = await req('GET', '/api/v1/admin/promos', { token });
  const first = afterReorder.json?.promos?.[0];
  reorder.status < 300 && first?.id === persistId && first?.sortOrder === 1
    ? pass('admin_reorder_promos')
    : fail(
        'admin_reorder_promos',
        `HTTP ${reorder.status} first=${first?.id}`,
      );

  const mismatch = await req('PATCH', '/api/v1/admin/promos/reorder', {
    token,
    body: { ids: [persistId] },
  });
  mismatch.status === 400 &&
  mismatch.json?.error?.code === 'PROMOS_REORDER_MISMATCH'
    ? pass('reorder_mismatch_rejected')
    : fail(
        'reorder_mismatch_rejected',
        `HTTP ${mismatch.status} ${JSON.stringify(mismatch.json)?.slice(0, 120)}`,
      );

  const missing = await req('PUT', '/api/v1/admin/promos/missing_promo_id', {
    token,
    body,
  });
  missing.status === 404
    ? pass('update_missing_promo_404')
    : fail('update_missing_promo_404', `HTTP ${missing.status}`);

  const deleted = await req('DELETE', `/api/v1/admin/promos/${persistId}`, {
    token,
  });
  const afterDelete = await req('GET', '/api/v1/admin/promos', { token });
  deleted.status < 300 &&
  !afterDelete.json?.promos?.some((p: { id?: string }) => p.id === persistId)
    ? pass('admin_delete_promo')
    : fail('admin_delete_promo', `HTTP ${deleted.status}`);

  const deleteMissing = await req(
    'DELETE',
    '/api/v1/admin/promos/missing_promo_id',
    { token },
  );
  deleteMissing.status === 404
    ? pass('delete_missing_promo_404')
    : fail('delete_missing_promo_404', `HTTP ${deleteMissing.status}`);
}
