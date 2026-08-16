import { fail, pass, req } from './e2e-names-lib';

export async function runNamesFramePersistChecks(superToken: string) {
  const persistId = `e2e_frame_${Date.now()}`;
  const frameBody = {
    id: persistId,
    label: 'E2E Persist',
    prefix: '★',
    suffix: '★',
    premium: false,
    enabled: true,
  };

  {
    const r = await req('POST', '/api/v1/admin/names/frames');
    r.status === 401
      ? pass('frame_create_requires_auth')
      : fail('frame_create_requires_auth', `HTTP ${r.status}`);
  }

  const createdFrame = await req('POST', '/api/v1/admin/names/frames', {
    token: superToken,
    body: frameBody,
  });
  createdFrame.status < 300 && createdFrame.json?.id === persistId
    ? pass('admin_create_frame')
    : fail(
        'admin_create_frame',
        `HTTP ${createdFrame.status} ${JSON.stringify(createdFrame.json)?.slice(0, 180)}`,
      );

  const afterCreate = await req('GET', '/api/v1/admin/names', {
    token: superToken,
  });
  afterCreate.json?.frames?.some((f: { id?: string }) => f.id === persistId)
    ? pass('created_frame_present_on_get')
    : fail('created_frame_present_on_get');

  const updatedFrame = await req(
    'PUT',
    `/api/v1/admin/names/frames/${persistId}`,
    {
      token: superToken,
      body: { ...frameBody, label: 'E2E Persist Edited', enabled: false },
    },
  );
  const afterUpdate = await req('GET', '/api/v1/admin/names', {
    token: superToken,
  });
  const updatedRow = afterUpdate.json?.frames?.find(
    (f: { id?: string }) => f.id === persistId,
  );
  updatedFrame.status < 300 &&
  updatedRow?.label === 'E2E Persist Edited' &&
  updatedRow?.enabled === false
    ? pass('admin_update_toggle_frame')
    : fail('admin_update_toggle_frame', JSON.stringify(updatedRow)?.slice(0, 160));

  const dup = await req('POST', '/api/v1/admin/names/frames', {
    token: superToken,
    body: frameBody,
  });
  dup.status === 409 && dup.json?.error?.code === 'NAMES_DUP_FRAME'
    ? pass('duplicate_frame_id_rejected')
    : fail(
        'duplicate_frame_id_rejected',
        `HTTP ${dup.status} ${JSON.stringify(dup.json)?.slice(0, 160)}`,
      );

  const policyOnly = await req('PUT', '/api/v1/admin/names', {
    token: superToken,
    body: {
      policy: {
        maxNameChars: 12,
        maxBatchSize: 48,
        blockSpaces: true,
        requireStyleWrap: true,
        remotePackEnabled: false,
        remotePackUrl: '',
      },
    },
  });
  const afterPolicy = await req('GET', '/api/v1/admin/names', {
    token: superToken,
  });
  policyOnly.status < 300 &&
  afterPolicy.json?.frames?.some((f: { id?: string }) => f.id === persistId) &&
  afterPolicy.json?.frames?.some((f: { id?: string }) => f.id === 'e2e_classic')
    ? pass('policy_only_save_keeps_frames')
    : fail(
        'policy_only_save_keeps_frames',
        `HTTP ${policyOnly.status} ${JSON.stringify(afterPolicy.json?.frames)?.slice(0, 180)}`,
      );

  const deletedFrame = await req(
    'DELETE',
    `/api/v1/admin/names/frames/${persistId}`,
    { token: superToken },
  );
  const afterDelete = await req('GET', '/api/v1/admin/names', {
    token: superToken,
  });
  deletedFrame.status < 300 &&
  !afterDelete.json?.frames?.some((f: { id?: string }) => f.id === persistId)
    ? pass('admin_delete_frame')
    : fail('admin_delete_frame', `HTTP ${deletedFrame.status}`);

  return persistId;
}
