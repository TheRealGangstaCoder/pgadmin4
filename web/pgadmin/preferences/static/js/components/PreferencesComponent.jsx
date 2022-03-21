/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import React, { useEffect } from 'react';
import { FileType } from 'react-aspen';
import { Box } from '@material-ui/core';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import SchemaView from '../../../../static/js/SchemaView';
import getApiInstance from '../../../../static/js/api_instance';
import CloseSharpIcon from '@material-ui/icons/CloseSharp';
import HelpIcon from '@material-ui/icons/HelpRounded';
import SaveSharpIcon from '@material-ui/icons/SaveSharp';
import clsx from 'clsx';
import Notify from '../../../../static/js/helpers/Notifier';
import pgAdmin from 'sources/pgadmin';
import { DefaultButton, PgIconButton, PrimaryButton } from '../../../../static/js/components/Buttons';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { getBinaryPathSchema } from '../../../../browser/server_groups/servers/static/js/binary_path.ui';
import { _set_dynamic_tab } from '../../../../tools/datagrid/static/js/show_query_tool';

class PreferencesSchema extends BaseUISchema {
  constructor(initValues = {}, schemaFields = []) {
    super({
      ...initValues
    });
    this.schemaFields = schemaFields;
    this.category = '';
  }

  get idAttribute() {
    return 'id';
  }

  setSelectedCategory(category) {
    this.category = category;
  }

  get baseFields() {
    return this.schemaFields;
  }
}

const useStyles = makeStyles((theme) =>
  ({
    root: {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      height: '100%',
      backgroundColor: theme.palette.background.default,
      overflow: 'hidden',
      '&$disabled': {
        color: '#ddd',
      }
    },
    body: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    },
    preferences: {
      borderColor: theme.otherVars.borderColor,
      display: 'flex',
      flexGrow: 1,
      height: '100%',
      minHeight: 0,
      overflow: 'hidden'

    },
    treeContainer: {
      flexBasis: '25%',
      alignItems: 'flex-start',
      paddingLeft: '5px',
      minHeight: 0,
      flexGrow: 1
    },
    tree: {
      height: '100%',
      flexGrow: 1
    },
    preferencesContainer: {
      flexBasis: '75%',
      padding: '5px',
      borderColor: theme.otherVars.borderColor + '!important',
      borderLeft: '1px solid',
      position: 'relative',
      height: '100%',
      paddingTop: '5px',
      overflow: 'auto'
    },
    actionBtn: {
      alignItems: 'flex-start',
    },
    buttonMargin: {
      marginLeft: '0.5em'
    },
    footer: {
      borderTop: '1px solid #dde0e6 !important',
      padding: '0.5rem',
      display: 'flex',
      width: '100%',
      background: theme.otherVars.headerBg,
    },
    customTreeClass: {
      '& .react-checkbox-tree': {
        height: '100% !important',
        border: 'none !important',
      },
    },
    preferencesTree: {
      height: 'calc(100% - 50px)',
      minHeight: 0
    }
  }),
);


function RightPanel({ schema, ...props }) {
  let initData = () => new Promise((resolve, reject) => {
    try {
      resolve(props.initValues);
    } catch (error) {
      reject(error);
    }
  });

  return (
    <SchemaView
      formType={'dialog'}
      getInitData={initData}
      viewHelperProps={{ mode: 'edit' }}
      schema={schema}
      showFooter={false}
      isTabView={false}
      onDataChange={(isChanged, changedData) => {
        props.onDataChange(changedData);
      }}
    />
  );
}

RightPanel.propTypes = {
  schema: PropTypes.object,
  initValues: PropTypes.object,
  onDataChange: PropTypes.func
};


export default function PreferencesComponent({ ...props }) {
  const classes = useStyles();
  const [disableSave, setDisableSave] = React.useState(true);
  const prefSchema = React.useRef(new PreferencesSchema({}, []));
  const prefChangedData = React.useRef({});
  const prefTreeInit = React.useRef(false);
  const [prefTreeData, setPrefTreeData] = React.useState(null);
  const [initValues, setInitValues] = React.useState({});
  const [loadTree, setLoadTree] = React.useState(0);
  const api = getApiInstance();

  useEffect(() => {
    const pref_url = url_for('preferences.index');
    api({
      url: pref_url,
      method: 'GET',
    }).then((res) => {
      let preferencesData = [];
      let preferencesTreeData = [];
      let preferencesValues = {};
      res.data.forEach(node => {
        let id = Math.floor(Math.random() * 1000);
        let tdata = {
          'id': id.toString(),
          'label': node.label,
          '_label': node.label,
          'name': node.label,
          'icon': '',
          'inode': true,
          'type': 2,
          '_type': node.label.toLowerCase(),
          '_id': id,
          '_pid': null,
          'childrenNodes': [],
          'expanded': true,
          'isExpanded': true,
        };

        node.children.forEach(subNode => {
          let sid = Math.floor(Math.random() * 1000);
          let nodeData = {
            'id': sid.toString(),
            'label': subNode.label,
            '_label': subNode.label,
            'name': subNode.label,
            'icon': '',
            'inode': false,
            '_type': subNode.label.toLowerCase(),
            '_id': sid,
            '_pid': node.id,
            'type': 1,
            'expanded': false,
          };

          if (subNode.label == 'Nodes' && node.label == 'Browser') {
            //Add Note for Nodes 
            preferencesData.push(
              {
                id: 'note_' + subNode.id,
                type: 'note', text: [gettext('This settings is to Show/Hide nodes in the browser tree.')].join(''),
                visible: false,
                'parentId': nodeData['id']
              },
            );
          }
          subNode.preferences.forEach((element) => {
            let addNote = false;
            let note = '';
            let type = getControlMappedForType(element.type);

            if (type === 'file') {
              addNote = true;
              note = gettext('Enter the directory in which the psql, pg_dump, pg_dumpall, and pg_restore utilities can be found for the corresponding database server version.  The default path will be used for server versions that do not have a  path specified.');
              element.type = 'collection';
              element.schema = getBinaryPathSchema();
              element.canAdd = false;
              element.canDelete = false;
              element.canEdit = false;
              element.editable = false;
              element.disabled = true;
              preferencesValues[element.id] = JSON.parse(element.value);
            }
            else if (type == 'select') {
              if (element.control_props !== undefined) {
                element.controlProps = element.control_props;
              } else {
                element.controlProps = {};
              }

              element.type = type;
              preferencesValues[element.id] = element.value;

              if (element.name == 'theme') {
                element.type = 'theme';

                element.options.forEach((opt) => {
                  if (opt.value == element.value) {
                    opt.selected = true;
                  } else {
                    opt.selected = false;
                  }
                });
              }
            }
            else if (type === 'keyboardShortcut') {
              element.type = 'keyboardShortcut';
              element.canAdd = false;
              element.canDelete = false;
              element.canEdit = false;
              element.editable = false;
              if (pgAdmin.Browser.get_preference(node.label.toLowerCase(), element.name)?.value) {
                let temp = pgAdmin.Browser.get_preference(node.label.toLowerCase(), element.name).value;
                preferencesValues[element.id] = temp;
              } else {
                preferencesValues[element.id] = element.value;
              }
              delete element.value;
            } else if (type === 'threshold') {
              element.type = 'threshold';

              let _val = element.value.split('|');
              preferencesValues[element.id] = { 'warning': _val[0], 'alert': _val[1] };
            } else {
              element.type = type;
              preferencesValues[element.id] = element.value;
            }

            delete element.value;
            element.visible = false;
            element.helpMessage = element?.help_str ? element.help_str : null;
            preferencesData.push(element);

            if (addNote) {
              preferencesData.push(
                {
                  id: 'note_' + element.id,
                  type: 'note', text: [
                    '<ul><li>',
                    gettext(note),
                    '</li></ul>',
                  ].join(''),
                  visible: false,
                  'parentId': nodeData['id']
                },
              );
            }
            element.parentId = nodeData['id'];
          });
          tdata['childrenNodes'].push(nodeData);
        });

        // set Preferences Tree data
        preferencesTreeData.push(tdata);

      });
      setPrefTreeData(preferencesTreeData);
      setInitValues(preferencesValues);
      // set Preferences schema
      prefSchema.current = new PreferencesSchema(preferencesValues, preferencesData);
    }).catch((err) => {
      Notify.alert(err);
    });
  }, []);

  useEffect(() => {
    props.renderTree(prefTreeData);
    let initTreeTimeout = null;

    // Listen selected preferences tree node event and show the appropriate components in right panel.
    pgAdmin.Browser.Events.on('preferences:tree:selected', (item) => {
      if (item.type == FileType.File) {
        prefSchema.current.schemaFields.forEach((field) => {
          field.visible = field.parentId === item._metadata.data.id;
        });
        setLoadTree(Math.floor(Math.random() * 1000));
        initTreeTimeout = setTimeout(()=> {
          prefTreeInit.current = true;
        }, 10);
      }
      else {
        if(item.isExpanded && item._children && item._children.length > 0 && prefTreeInit.current) {
          pgAdmin.Browser.ptree.tree.setActiveFile(item._children[0], true);
        }
      }
    });

    // Listen open preferences tree node event to default select first child node on parent node selection.
    pgAdmin.Browser.Events.on('preferences:tree:opened', (item) => {
      if (item._fileName == 'Browser' && item.type == 2 && item.isExpanded && item._children && item._children.length > 0 && !prefTreeInit.current) {
        pgAdmin.Browser.ptree.tree.setActiveFile(item._children[0], false);
      } 
      else if(prefTreeInit.current) {
        pgAdmin.Browser.ptree.tree.setActiveFile(item._children[0], true);
      }
    });

    // Listen added preferences tree node event to expand the newly added node on tree load.
    pgAdmin.Browser.Events.on('preferences:tree:added', (item) => {
      // Check the if newely added node is Directoy call toggle to expand the node.
      if (item.type == FileType.Directory) {
        pgAdmin.Browser.ptree.tree.toggleDirectory(item);
      }
    });

    /* Clear the initTreeTimeout timeout if unmounted */
    return ()=>{
      clearTimeout(initTreeTimeout);
    };
  }, [prefTreeData]);



  function getControlMappedForType(type) {
    switch (type) {
    case 'text':
      return 'text';
    case 'input':
      return 'text';
    case 'boolean':
      return 'switch';
    case 'node':
      return 'switch';
    case 'integer':
      return 'numeric';
    case 'numeric':
      return 'numeric';
    case 'date':
      return 'datetimepicker';
    case 'datetime':
      return 'datetimepicker';
    case 'options':
      return 'select';
    case 'select':
      return 'select';
    case 'select2':
      return 'select';
    case 'multiline':
      return 'multiline';
    case 'switch':
      return 'switch';
    case 'keyboardshortcut':
      return 'keyboardShortcut';
    case 'radioModern':
      return 'toggle';
    case 'selectFile':
      return 'file';
    case 'threshold':
      return 'threshold';
    default:
      if (console && console.warn) {
        // Warning for developer only.
        console.warn(
          'Hmm.. We don\'t know how to render this type - \'\'' + type + '\' of control.'
        );
      }
      return 'input';
    }
  }

  function getCollectionValue(_metadata, value, initValues) {
    let val = value;
    if (typeof (value) == 'object') {
      if (_metadata[0].type == 'collection' && _metadata[0].schema) {
        if ('binaryPath' in value.changed[0]) {
          let pathData = [];
          let pathVersions = [];
          value.changed.forEach((chValue) => {
            pathVersions.push(chValue.version);
          });
          initValues[_metadata[0].id].forEach((initVal) => {
            if (pathVersions.includes(initVal.version)) {
              pathData.push(value.changed[pathVersions.indexOf(initVal.version)]);
            }
            else {
              pathData.push(initVal);
            }
          });
          val = JSON.stringify(pathData);
        } else {
          let key_val = {
            'char': value.changed[0]['key'],
            'key_code': value.changed[0]['code'],
          };
          value.changed[0]['key'] = key_val;
          val = value.changed[0];
        }
      } else if ('warning' in value) {
        val = value['warning'] + '|' + value['alert'];
      } else if (value?.changed && value.changed.length > 0) {
        val = JSON.stringify(value.changed);
      }
    }
    return val;
  }

  function savePreferences(data, initValues) {
    let _data = [];
    for (const [key, value] of Object.entries(data.current)) {
      let _metadata = prefSchema.current.schemaFields.filter((el) => { return el.id == key; });
      if (_metadata.length > 0) {
        let val = getCollectionValue(_metadata, value, initValues);
        _data.push({
          'category_id': _metadata[0]['cid'],
          'id': parseInt(key),
          'mid': _metadata[0]['mid'],
          'name': _metadata[0]['name'],
          'value': val,
        });
      }
    }

    if (_data.length > 0) {
      save(_data, data);
    }

  }

  function checkRefreshRequired(pref, requires_refresh) {
    if (pref.name == 'theme') {
      requires_refresh = true;
    }

    if (pref.name == 'user_language') {
      requires_refresh = true;
    }

    return requires_refresh;
  }

  function save(save_data, data) {
    api({
      url: url_for('preferences.index'),
      method: 'PUT',
      data: save_data,
    }).then(() => {
      let requires_refresh = false;
      /* Find the modules changed */
      let modulesChanged = {};
      for (const [key] of Object.entries(data.current)) {
        let pref = pgAdmin.Browser.get_preference_for_id(Number(key));

        if (pref['name'] == 'dynamic_tabs') {
          _set_dynamic_tab(pgAdmin.Browser, !pref['value']);
        }

        if (!modulesChanged[pref.module]) {
          modulesChanged[pref.module] = true;
        }

        requires_refresh = checkRefreshRequired(pref, requires_refresh);

        if (pref.name == 'hide_shared_server') {
          Notify.confirm(
            gettext('Browser tree refresh required'),
            gettext('A browser tree refresh is required. Do you wish to refresh the tree?'),
            function () {
              pgAdmin.Browser.tree.destroy({
                success: function () {
                  pgAdmin.Browser.initializeBrowserTree(pgAdmin.Browser);
                  return true;
                },
              });
            },
            function () {
              return true;
            },
            gettext('Refresh'),
            gettext('Later')
          );
        }
      }

      if (requires_refresh) {
        Notify.confirm(
          gettext('Refresh required'),
          gettext('A page refresh is required to apply the theme. Do you wish to refresh the page now?'),
          function () {
            /* If user clicks Yes */
            location.reload();
            return true;
          },
          function () { props.closeModal(); /*props.panel.close()*/ },
          gettext('Refresh'),
          gettext('Later')
        );
      }
      // Refresh preferences cache
      pgAdmin.Browser.cache_preferences(modulesChanged);
      props.closeModal(); /*props.panel.close()*/
    }).catch((err) => {
      Notify.alert(err.response.data);
    });
  }

  const onDialogHelp = () => {
    window.open(url_for('help.static', { 'filename': 'preferences.html' }), 'pgadmin_help');
  };

  return (
    <Box height={'100%'}>
      <Box className={classes.root}>
        <Box className={clsx(classes.preferences)}>
          <Box className={clsx(classes.treeContainer)} >
            <Box className={clsx('aciTree', classes.tree)} id={'treeContainer'}></Box>
          </Box>
          <Box className={clsx(classes.preferencesContainer)}>
            {
              prefSchema.current && loadTree > 0 ?
                <RightPanel schema={prefSchema.current} initValues={initValues} onDataChange={(changedData) => {
                  Object.keys(changedData).length > 0 ? setDisableSave(false) : setDisableSave(true);
                  prefChangedData.current = changedData;
                }}></RightPanel>
                : <></>
            }
          </Box>
        </Box>
        <Box className={classes.footer}>
          <Box>
            <PgIconButton data-test="dialog-help" onClick={onDialogHelp} icon={<HelpIcon />} title={gettext('Help for this dialog.')} />
          </Box>
          <Box className={classes.actionBtn} marginLeft="auto">
            <DefaultButton className={classes.buttonMargin} onClick={() => { props.closeModal(); /*props.panel.close()*/ }} startIcon={<CloseSharpIcon onClick={() => { props.closeModal(); /*props.panel.close()*/ }} />}>
              {gettext('Cancel')}
            </DefaultButton>
            <PrimaryButton className={classes.buttonMargin} startIcon={<SaveSharpIcon />} disabled={disableSave} onClick={() => { savePreferences(prefChangedData, initValues); }}>
              {gettext('Save')}
            </PrimaryButton>
          </Box>
        </Box>
        {/* </Box> */}

      </Box >
    </Box>
  );
}

PreferencesComponent.propTypes = {
  schema: PropTypes.array,
  initValues: PropTypes.object,
  closeModal: PropTypes.func,
  renderTree: PropTypes.func
};