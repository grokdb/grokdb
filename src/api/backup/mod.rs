extern crate iron;
extern crate router;
extern crate bodyparser;
extern crate rustc_serialize;
extern crate chrono;

use chrono::*;
use iron::status;
use iron::prelude::*;
use router::Router;
use urlencoded::{UrlEncodedQuery, QueryMap, UrlDecodingError};
use rustc_serialize::json;

use std::sync::Arc;
use std::ops::Deref;
use std::error::Error;
use std::path::{Path, PathBuf};

use ::api::{GrokDB, ErrorResponse};

#[derive(Debug, Clone, RustcDecodable)]
pub struct BackupRequest {
    name: Option<String>,
    dest_path: Option<String>,
    with_timestamp: Option<bool>
}

impl BackupRequest {

    fn with_timestamp(&self) -> bool {

        if self.with_timestamp.is_some() {
            return self.with_timestamp.unwrap();
        }

        return true;
    }

    fn get_name(&self, default_name: &String) -> String {

        if self.name.is_some() {
            return format!("{}", self.name.as_ref().unwrap());
        }

        return format!("{}", default_name);
    }

    fn get_dest(&self) -> String {

        if self.dest_path.is_some() {
            return format!("{}", self.dest_path.as_ref().unwrap());
        }

        return format!("./");
    }

    fn get_path(&self, default_name: &String) -> String {

        let name: String = {

            let __name: String = self.get_name(default_name);

            if self.with_timestamp() {
                format!("{}-{}.db",
                    __name,
                    UTC::now().format("%a-%b-%e--%H-%M-%S-%Y").to_string())
            } else {
                format!("{}.db", __name)
            }
        };

        let path = format!("{}/{}", self.get_dest(), name);
        let path = Path::new(&path);

        let normalized: PathBuf = path.iter().collect();
        let normalized = normalized.to_str().unwrap();

        return normalized.to_string();
    }
}

#[derive(Debug, RustcEncodable)]
pub struct BackupResponse {
    dest_file: String
}

impl BackupResponse {

    pub fn to_json(&self) -> String {
        return json::encode(self).unwrap();
    }
}

// attach backup REST endpoints to given router
pub fn restify(router: &mut Router, grokdb: GrokDB) {

    let grokdb = Arc::new(grokdb);

    router.put("/backup", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

            // parse json

            let backup_request = req.get::<bodyparser::Struct<BackupRequest>>();

            let backup_request: BackupRequest = match backup_request {
                Ok(Some(backup_request)) => backup_request,

                Ok(None) => {
                    BackupRequest {
                        name: Some(format!("{}", grokdb.base_db_name)),
                        dest_path: Some(format!("./")),
                        with_timestamp: Some(true)
                    }
                },

                Err(err) => {

                    let ref reason = format!("{:?}", err);
                    let res_code = status::BadRequest;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: err.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                }
            };

            let db_conn_guard = grokdb.decks.db.lock().unwrap();
            let ref db_conn = *db_conn_guard;

            let dest_path: String = backup_request.get_path(&grokdb.base_db_name);

            match db_conn.backup("main", &dest_path) {
                Err(why) => {

                    let ref reason = format!("{:?}", why);
                    let res_code = status::InternalServerError;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                },
                _ => {
                    // backup complete
                }
            };

            let response = BackupResponse {
                dest_file: dest_path
            };

            let res_code = status::Ok;
            return Ok(Response::with((res_code, response.to_json())));
        }
    });
}
