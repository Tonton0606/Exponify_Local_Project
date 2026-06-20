const { supabase } = require('../config/supabase');

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function isAdminRole(role) {
  return ['admin', 'super_admin'].includes(normalizeRole(role));
}

function isRemovedStatus(status) {
  return ['removed', 'archived', 'inactive', 'disabled'].includes(
    String(status || '').trim().toLowerCase()
  );
}

async function requireAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next({
        status: 401,
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next({
        status: 401,
        message: 'Unauthorized: invalid or expired token',
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return next({
        status: 403,
        message: 'User profile not found',
      });
    }

    if (isRemovedStatus(profile.status)) {
      return next({
        status: 403,
        message: 'User account is not active',
      });
    }

    const role = normalizeRole(profile.role);
    const isAdmin = isAdminRole(role);

    const requestedWorkspace =
      req.headers['x-workspace-id'] ||
      req.body?.workspaceId ||
      req.body?.workspace_id ||
      req.query?.workspaceId ||
      req.query?.workspace_id ||
      req.params?.workspaceId ||
      req.params?.workspace_id ||
      '';

    let workspaceRole = role || 'member';

    if (requestedWorkspace && !isAdmin) {
      const { data: membership, error: membershipError } = await supabase
        .from('workspace_members')
        .select('role, status')
        .eq('workspace_id', requestedWorkspace)
        .eq('user_id', user.id)
        .maybeSingle();

      if (
        membershipError ||
        !membership ||
        isRemovedStatus(membership.status)
      ) {
        return next({
          status: 403,
          message: 'Not authorized for this workspace',
        });
      }

      workspaceRole = membership.role || workspaceRole;
    }

    req.user = user;
    req.profile = profile;
    req.workspaceId = requestedWorkspace || null;
    req.workspaceRole = workspaceRole;
    req.isAdmin = isAdmin;

    return next();
  } catch (_error) {
    return next({
      status: 500,
      message: 'Authentication error',
    });
  }
}

function handleAuthError(error, req, res, _next) {
  if (error?.status) {
    return res.status(error.status).json({
      success: false,
      error: error.message,
      path: req.originalUrl,
    });
  }

  return res.status(500).json({
    success: false,
    error: error.message || 'Internal server error',
    path: req.originalUrl,
  });
}

function requireWorkspaceRow(table, idColumn = 'id') {
  return async (req, res, next) => {
    try {
      const id = req.params[idColumn] || req.params.id;

      if (!id) {
        return next({
          status: 400,
          message: 'Record id required',
        });
      }

      const { data, error } = await supabase
        .from(table)
        .select('workspace_id')
        .eq(idColumn, id)
        .single();

      if (error || !data) {
        return next({
          status: 404,
          message: 'Record not found',
        });
      }

      if (!req.isAdmin && data.workspace_id !== req.workspaceId) {
        return next({
          status: 403,
          message: 'Not authorized for this workspace',
        });
      }

      req.workspaceRecord = data;

      return next();
    } catch (_error) {
      return next({
        status: 500,
        message: 'Workspace authorization error',
      });
    }
  };
}

async function requireAuthOnly(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next({
        status: 401,
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next({
        status: 401,
        message: 'Unauthorized: invalid or expired token',
      });
    }

    req.user = user;

    return next();
  } catch (_error) {
    return next({
      status: 500,
      message: 'Authentication error',
    });
  }
}

module.exports = {
  requireAuth,
  requireAuthOnly,
  handleAuthError,
  requireWorkspaceRow,
};
